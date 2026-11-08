import { onlineFetch } from '../offline/onlineFetch';
import { requireOnline } from '../offline/status';
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../config/firebase";

const APPROVAL_URL = String(
  import.meta.env.VITE_ADMIN_APPROVAL_URL ||
    "https://block-system-credit-monitor.24-05076.workers.dev/api/admin-requests/approve"
).trim();

export async function approveAdminRequest(requestId) {
  requireOnline("Admin approval");
  const currentUser = auth.currentUser;

  if (!currentUser || currentUser.isAnonymous) {
    throw new Error("Your admin session expired. Sign in again.");
  }

  const idToken = await currentUser.getIdToken(true);
  const response = await onlineFetch(APPROVAL_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ requestId }),
  });

  const responseText = await response.text();
  let data = {};

  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = { message: responseText };
  }

  if (!response.ok || data.success !== true) {
    throw new Error(
      data.message || `Unable to create the admin account (${response.status}).`
    );
  }

  return data;
}

export async function sendAdminPasswordSetupEmail(email) {
  try {
    await sendPasswordResetEmail(auth, String(email || "").trim().toLowerCase());
  } catch (error) {
    throw new Error(
      "The account was created, but the password-setup email could not be sent. Use Forgot password on the login page."
    );
  }
}
