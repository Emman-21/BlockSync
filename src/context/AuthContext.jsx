import { requireSingleAccountTab } from '../offline/accountTabs';
import { profileDecision } from '../offline/profilePolicy';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  setPersistence,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from "firebase/auth";
import { doc, getDocFromCache, onSnapshot } from "firebase/firestore";
import { requireOnline, assertNoPendingWork } from '../offline/status';
import { isTrustedDevice, rememberAccount, savedAccountUid } from '../offline/device';
import { clearAccountData } from '../offline/clearAccountData';
import { auth, db } from "../config/firebase";
import { getDoc } from "../services/trackedFirestore";

const AuthContext = createContext(null);
const ALLOWED_ROLES = new Set(["admin", "student"]);
const GUEST_SESSION_KEY = "itnt3108-guest-student";

const readGuestStudent = (firebaseUser = null) => {
  try {
    const value = JSON.parse(sessionStorage.getItem(GUEST_SESSION_KEY) || "null");

    if (!value?.id || !value?.name) return null;

    return {
      uid: firebaseUser?.uid || `guest:${value.id}`,
      email: "",
      name: value.name,
      studentId: value.id,
      studentNumber: value.studentNumber || "",
      role: "student",
      active: true,
      isGuest: true,
      isAnonymous: Boolean(firebaseUser?.isAnonymous),
    };
  } catch {
    try { sessionStorage.removeItem(GUEST_SESSION_KEY); } catch { /* Storage is unavailable. */ }
    return null;
  }
};

const getReadableAuthError = (error) => {
  switch (error?.code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Invalid email or password.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact your administrator.";
    case "auth/too-many-requests":
      return "Too many unsuccessful attempts. Please try again later.";
    case "auth/weak-password":
      return "Use a stronger password with at least 8 characters.";
    case "auth/requires-recent-login":
      return "For security, sign in again before changing your password.";
    case "auth/credential-already-in-use":
      return "This credential is already connected to another account.";
    case "auth/network-request-failed":
      return "Unable to reach the authentication service. Check your connection.";
    case "auth/operation-not-allowed":
      return "This Firebase sign-in method is not enabled. Enable Anonymous authentication for students and Email/Password authentication for admins.";
    default:
      return error?.message || "Authentication failed. Please try again.";
  }
};

const normalizeProfile = (firebaseUser, profileData) => {
  const role = String(profileData.role || "").toLowerCase();

  if (!ALLOWED_ROLES.has(role)) {
    throw new Error(
      "Your account has no valid system role. Contact your administrator."
    );
  }

  if (profileData.active !== true) {
    throw new Error("This account is inactive. Contact your administrator.");
  }

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || "",
    emailVerified: firebaseUser.emailVerified,
    name:
      profileData.name ||
      profileData.displayName ||
      firebaseUser.displayName ||
      firebaseUser.email?.split("@")[0] ||
      "User",
    role,
    active: true,
    studentId: profileData.studentId || "",
    createdAt: profileData.createdAt || null,
    updatedAt: profileData.updatedAt || null,
  };
};

const loadUserProfile = async (firebaseUser) => {
  const profileReference = doc(db, "users", firebaseUser.uid);
  const profileSnapshot = await (navigator.onLine ? getDoc(profileReference) : getDocFromCache(profileReference));

  if (!profileSnapshot.exists()) {
    throw new Error(
      "Your account does not have a system profile. Contact your administrator."
    );
  }

  return normalizeProfile(firebaseUser, profileSnapshot.data());
};

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let stopProfile = () => {};
    let generation = 0;
    const unsubscribe = onAuthStateChanged(auth, next => {
      const current = ++generation;
      stopProfile();
      setFirebaseUser(next);
      setUser(null);
      setAuthError('');
      if (!next) { setLoading(false); return; }
      rememberAccount(next.uid);
      if (next.isAnonymous) {
        // Keep student authentication session-scoped; do not promote it on reload.
        setUser(readGuestStudent(next));
        setLoading(false);
        return;
      }
      setLoading(true);
      stopProfile = onSnapshot(doc(db, 'users', next.uid), { includeMetadataChanges: true }, snapshot => {
        if (current !== generation) return;
        const decision = profileDecision(snapshot);
        if (decision === 'unavailable') {
          setUser(null);
          setAuthError('No saved profile is available. Reconnect to verify your account; your sign-in session has been kept.');
          setLoading(false);
          return;
        }
        try {
          if (!snapshot.exists()) throw new Error('Your system profile no longer exists. Contact your administrator.');
          setUser({ ...normalizeProfile(next, snapshot.data()), profileFromCache: snapshot.metadata.fromCache });
          setAuthError('');
        } catch (error) {
          setUser(null);
          setAuthError(error.message);
          // A cached invalid/missing profile is not proof of a revoked server role.
          if (!snapshot.metadata.fromCache) void signOut(auth);
        }
        setLoading(false);
      }, error => {
        if (current !== generation) return;
        setAuthError(error.message || 'Could not verify your profile. Reconnect to try again.');
        setLoading(false);
        if (['permission-denied', 'unauthenticated'].includes(error.code)) {
          setUser(null);
          void signOut(auth);
        }
      });
    });
    return () => { generation++; stopProfile(); unsubscribe(); };
  }, []);

  const loginAdmin = useCallback(async (email, password) => {
    requireOnline("Signing in");
    assertNoPendingWork();
    await requireSingleAccountTab();
    if (auth.currentUser || savedAccountUid()) throw new Error('Sign out and clear saved account data before starting another sign-in.');
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      throw new Error("Email and password are required.");
    }

    setAuthError("");
    sessionStorage.removeItem(GUEST_SESSION_KEY);

    try {
      await setPersistence(auth, isTrustedDevice() ? browserLocalPersistence : browserSessionPersistence);
      const credential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );
      const profile = await loadUserProfile(credential.user);

      if (profile.role !== "admin") {
        throw new Error(
          "This account does not have administrator access."
        );
      }

      setFirebaseUser(credential.user);
      setUser(profile);
      return profile;
    } catch (error) {
      try {
        if (auth.currentUser) await signOut(auth);
      } catch (signOutError) {
        console.error("Unable to clean up a failed login:", signOutError);
      }

      const message = getReadableAuthError(error);
      setFirebaseUser(null);
      setUser(null);
      setAuthError(message);
      throw new Error(message);
    }
  }, []);

  const loginStudent = useCallback(async (student) => {
    requireOnline("Starting a student session");
    assertNoPendingWork();
    await requireSingleAccountTab();
    if (auth.currentUser || savedAccountUid()) throw new Error('Sign out and clear saved account data before starting another student session.');
    const studentId = String(student?.id || "").trim();
    const normalizedName = String(student?.name || "").trim();

    if (!studentId || !normalizedName) {
      throw new Error("Select your registered student profile before continuing.");
    }

    if (auth.currentUser) {
      await signOut(auth);
    }

    sessionStorage.setItem(
      GUEST_SESSION_KEY,
      JSON.stringify({
        id: studentId,
        name: normalizedName,
        studentNumber: student.studentNumber || "",
      })
    );
    try {
      await setPersistence(auth, browserSessionPersistence);
      const credential = await signInAnonymously(auth);
      const guestStudent = readGuestStudent(credential.user);

      setFirebaseUser(credential.user);
      setUser(guestStudent);
      setAuthError("");
      return guestStudent;
    } catch (error) {
      sessionStorage.removeItem(GUEST_SESSION_KEY);
      setFirebaseUser(null);
      setUser(null);

      const message = getReadableAuthError(error);
      setAuthError(message);
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    await clearAccountData();
  }, []);

  const resetPassword = useCallback(async (email) => {
    requireOnline("Password reset");
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new Error("Enter your email address first.");
    }

    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
    } catch (error) {
      throw new Error(getReadableAuthError(error));
    }
  }, []);

  const changePassword = useCallback(
    async (currentPassword, newPassword) => {
      requireOnline("Password changes");
      const currentUser = auth.currentUser;
      const normalizedCurrentPassword = String(
        currentPassword || ""
      );
      const normalizedNewPassword = String(newPassword || "");

      if (
        !currentUser ||
        currentUser.isAnonymous ||
        user?.role !== "admin"
      ) {
        throw new Error(
          "Only a signed-in administrator can change this password."
        );
      }

      if (!currentUser.email) {
        throw new Error(
          "This administrator account has no email address."
        );
      }

      if (!normalizedCurrentPassword) {
        throw new Error("Enter your current password.");
      }

      if (normalizedNewPassword.length < 8) {
        throw new Error(
          "The new password must contain at least 8 characters."
        );
      }

      if (normalizedCurrentPassword === normalizedNewPassword) {
        throw new Error(
          "The new password must be different from your current password."
        );
      }

      try {
        const credential = EmailAuthProvider.credential(
          currentUser.email,
          normalizedCurrentPassword
        );

        await reauthenticateWithCredential(
          currentUser,
          credential
        );

        await updatePassword(
          currentUser,
          normalizedNewPassword
        );

        setAuthError("");
      } catch (error) {
        const message = getReadableAuthError(error);
        setAuthError(message);
        throw new Error(message);
      }
    },
    [user?.role]
  );

  const refreshProfile = useCallback(async () => {
    requireOnline("Profile refresh");
    const currentFirebaseUser = auth.currentUser;

    if (!currentFirebaseUser) {
      setFirebaseUser(null);
      setUser(null);
      return null;
    }

    setLoading(true);

    try {
      await currentFirebaseUser.reload();

      if (currentFirebaseUser.isAnonymous) {
        const guestStudent = readGuestStudent(currentFirebaseUser);
        setFirebaseUser(currentFirebaseUser);
        setUser(guestStudent);
        setAuthError("");
        return guestStudent;
      }

      const profile = await loadUserProfile(currentFirebaseUser);
      setFirebaseUser(currentFirebaseUser);
      setUser(profile);
      setAuthError("");
      return profile;
    } catch (error) {
      const message = getReadableAuthError(error);
      setAuthError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      firebaseUser,
      user,
      loading,
      authLoading: loading,
      authError,
      isAuthenticated: Boolean(user),
      isAdmin:
        Boolean(firebaseUser) &&
        user?.role === "admin" &&
        user?.active === true,
      isStudent:
        Boolean(firebaseUser) &&
        user?.role === "student" &&
        user?.active === true,
      login: loginAdmin,
      loginAdmin,
      loginStudent,
      logout,
      resetPassword,
      changePassword,
      refreshProfile,
    }),
    [
      authError,
      firebaseUser,
      loading,
      loginAdmin,
      loginStudent,
      logout,
      changePassword,
      refreshProfile,
      resetPassword,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
