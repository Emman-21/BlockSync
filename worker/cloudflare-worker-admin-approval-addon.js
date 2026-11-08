/*
  ADD THIS FILE'S FUNCTIONS ABOVE YOUR WORKER'S `export default`.

  Then update CORS:
    Access-Control-Allow-Methods: "GET, POST, OPTIONS"

  Add this route BEFORE the Worker's GET-only method check:

    if (
      url.pathname === "/api/admin-requests/approve" &&
      request.method === "POST"
    ) {
      return handleAdminApproval(request, env);
    }

  Required existing Worker secret:
    FIREBASE_SERVICE_ACCOUNT_JSON

  New Worker secret:
    FIREBASE_WEB_API_KEY
*/

const ADMIN_SCHOOL_EMAIL_DOMAIN = "@g.batstate-u.edu.ph";

function adminBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function adminBufferBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function adminPemBuffer(pem) {
  const base64 = pem
    .replace(/\\n/g, "\n")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

async function createAdminGoogleToken(serviceAccount) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = adminBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = adminBase64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: [
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/datastore",
      "https://www.googleapis.com/auth/identitytoolkit",
    ].join(" "),
    aud: "https://oauth2.googleapis.com/token",
    iat: issuedAt,
    exp: issuedAt + 3600,
  }));
  const unsignedToken = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    adminPemBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken)
  );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsignedToken}.${adminBufferBase64Url(signature)}`,
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || "Firebase service-account authentication failed.");
  }
  return data.access_token;
}

function fromFirestoreValue(value) {
  if (!value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("timestampValue" in value) return value.timestampValue;
  return null;
}

function fromFirestoreDocument(document) {
  return Object.fromEntries(
    Object.entries(document?.fields || {}).map(([key, value]) => [
      key,
      fromFirestoreValue(value),
    ])
  );
}

function firestoreFields(values) {
  const fields = {};
  Object.entries(values).forEach(([key, value]) => {
    if (typeof value === "boolean") fields[key] = { booleanValue: value };
    else if (value instanceof Date) fields[key] = { timestampValue: value.toISOString() };
    else fields[key] = { stringValue: String(value ?? "") };
  });
  return fields;
}

async function adminAuthorizedFetch(url, accessToken, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || `Google API request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function verifyApprovingAdmin({
  idToken,
  webApiKey,
  projectId,
  accessToken,
}) {
  const lookupResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(webApiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );
  const lookupData = await lookupResponse.json().catch(() => ({}));
  const firebaseUser = lookupData.users?.[0];
  if (!lookupResponse.ok || !firebaseUser?.localId) {
    const error = new Error("Your admin session is invalid or expired.");
    error.status = 401;
    throw error;
  }

  const profileUrl =
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(firebaseUser.localId)}`;
  let profileDocument;
  try {
    profileDocument = await adminAuthorizedFetch(profileUrl, accessToken);
  } catch (error) {
    error.status = error.status === 404 ? 403 : error.status;
    throw error;
  }
  const profile = fromFirestoreDocument(profileDocument);
  if (String(profile.role).toLowerCase() !== "admin" || profile.active !== true) {
    const error = new Error("Only an active administrator can approve this request.");
    error.status = 403;
    throw error;
  }
  return firebaseUser.localId;
}

async function findFirebaseAccount(projectId, email, accessToken) {
  const data = await adminAuthorizedFetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`,
    accessToken,
    { method: "POST", body: JSON.stringify({ email: [email] }) }
  );
  return data.users?.[0] || null;
}

function createTemporaryPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (value) => value.toString(36).padStart(2, "0")).join("") + "Aa1!";
}

async function createFirebaseAccount(webApiKey, email, displayName) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(webApiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: createTemporaryPassword(),
        displayName,
        returnSecureToken: false,
      }),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.localId) {
    throw new Error(data?.error?.message || "Firebase account creation failed.");
  }
  return data.localId;
}

async function handleAdminApproval(request, env) {
  try {
    const authorization = request.headers.get("Authorization") || "";
    const idToken = authorization.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";
    if (!idToken) {
      return jsonResponse(request, { success: false, message: "Missing administrator authorization." }, 401);
    }
    if (!env.FIREBASE_SERVICE_ACCOUNT_JSON || !env.FIREBASE_WEB_API_KEY) {
      return jsonResponse(request, {
        success: false,
        message: "Worker Firebase secrets are incomplete.",
      }, 503);
    }

    const body = await request.json().catch(() => ({}));
    const requestId = String(body.requestId || "").trim();
    if (!/^[A-Za-z0-9_-]{10,160}$/.test(requestId)) {
      return jsonResponse(request, { success: false, message: "Invalid admin request ID." }, 400);
    }

    const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
    const projectId = serviceAccount.project_id;
    const accessToken = await createAdminGoogleToken(serviceAccount);
    const approverUid = await verifyApprovingAdmin({
      idToken,
      webApiKey: env.FIREBASE_WEB_API_KEY,
      projectId,
      accessToken,
    });

    const documentBase =
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    const requestName = `projects/${projectId}/databases/(default)/documents/adminRequests/${requestId}`;
    const requestDocument = await adminAuthorizedFetch(
      `${documentBase}/adminRequests/${encodeURIComponent(requestId)}`,
      accessToken
    );
    const adminRequest = fromFirestoreDocument(requestDocument);
    if (adminRequest.status === "approved" && adminRequest.linkedUserId) {
      return jsonResponse(request, {
        success: true,
        alreadyApproved: true,
        alreadyExisted: true,
        uid: adminRequest.linkedUserId,
      });
    }
    if (adminRequest.status !== "pending") {
      return jsonResponse(request, {
        success: false,
        message: "This request is no longer pending.",
      }, 409);
    }

    const email = String(adminRequest.email || "").trim().toLowerCase();
    const fullName = String(adminRequest.fullName || "").trim();
    const studentNumber = String(adminRequest.studentNumber || "").trim();
    if (!email.endsWith(ADMIN_SCHOOL_EMAIL_DOMAIN) || fullName.length < 3) {
      return jsonResponse(request, {
        success: false,
        message: "The request contains invalid applicant information.",
      }, 400);
    }

    let firebaseAccount = await findFirebaseAccount(projectId, email, accessToken);
    const alreadyExisted = Boolean(firebaseAccount?.localId);
    const uid = firebaseAccount?.localId ||
      await createFirebaseAccount(env.FIREBASE_WEB_API_KEY, email, fullName);

    const now = new Date();
    const userName = `projects/${projectId}/databases/(default)/documents/users/${uid}`;
    await adminAuthorizedFetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          writes: [
            {
              update: {
                name: userName,
                fields: firestoreFields({
                  uid,
                  email,
                  name: fullName,
                  studentId: studentNumber,
                  role: "admin",
                  active: true,
                  requestId,
                  createdAt: now,
                  updatedAt: now,
                }),
              },
            },
            {
              update: {
                name: requestName,
                fields: firestoreFields({
                  status: "approved",
                  reviewedBy: approverUid,
                  linkedUserId: uid,
                  accountProvisioning: "completed",
                  reviewedAt: now,
                }),
              },
              updateMask: {
                fieldPaths: [
                  "status",
                  "reviewedBy",
                  "linkedUserId",
                  "accountProvisioning",
                  "reviewedAt",
                ],
              },
            },
          ],
        }),
      }
    );

    return jsonResponse(request, {
      success: true,
      uid,
      alreadyExisted,
      message: alreadyExisted
        ? "Existing Firebase account was granted admin access."
        : "Firebase admin account and profile were created.",
    });
  } catch (error) {
    console.error("Admin approval failed:", error);
    return jsonResponse(
      request,
      { success: false, message: error?.message || "Admin approval failed." },
      Number(error?.status) || 500
    );
  }
}
