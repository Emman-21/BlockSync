import {
  getApp,
  getApps,
  initializeApp,
} from "firebase/app";

import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache } from "firebase/firestore";
import { isTrustedDevice } from '../offline/device';

const requiredEnvironmentVariables = {
  VITE_FIREBASE_API_KEY:
    import.meta.env.VITE_FIREBASE_API_KEY,

  VITE_FIREBASE_AUTH_DOMAIN:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,

  VITE_FIREBASE_PROJECT_ID:
    import.meta.env.VITE_FIREBASE_PROJECT_ID,

  VITE_FIREBASE_STORAGE_BUCKET:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,

  VITE_FIREBASE_MESSAGING_SENDER_ID:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,

  VITE_FIREBASE_APP_ID:
    import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingEnvironmentVariables = Object.entries(
  requiredEnvironmentVariables
)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingEnvironmentVariables.length > 0) {
  throw new Error(
    `Missing Firebase environment variables: ${missingEnvironmentVariables.join(
      ", "
    )}`
  );
}

const firebaseConfig = {
  apiKey:
    requiredEnvironmentVariables.VITE_FIREBASE_API_KEY,

  authDomain:
    requiredEnvironmentVariables.VITE_FIREBASE_AUTH_DOMAIN,

  projectId:
    requiredEnvironmentVariables.VITE_FIREBASE_PROJECT_ID,

  storageBucket:
    requiredEnvironmentVariables.VITE_FIREBASE_STORAGE_BUCKET,

  messagingSenderId:
    requiredEnvironmentVariables
      .VITE_FIREBASE_MESSAGING_SENDER_ID,

  appId:
    requiredEnvironmentVariables.VITE_FIREBASE_APP_ID,
};

export const app =
  getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig);

const recaptchaEnterpriseSiteKey =
  import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY?.trim();

// Keep App Check optional until a site key has been configured. AI requests
// provide a clear setup message when App Check is required but unavailable.
export const appCheck = recaptchaEnterpriseSiteKey
  ? (() => {
      if (import.meta.env.DEV && typeof self !== "undefined") {
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }

      return initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(recaptchaEnterpriseSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    })()
  : null;

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: isTrustedDevice() && typeof indexedDB !== 'undefined'
    ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    : memoryLocalCache(),
});
