import { requireOnline } from '../offline/status';
import {
  collection,
  doc,
  GeoPoint,
  Timestamp,
} from "../services/trackedFirestore";
import { db } from "../config/firebase";
import {
  deleteDoc,
  getDocs,
  setDoc,
} from "../services/trackedFirestore";

const BACKUP_VERSION = 2;
const LEGACY_BACKUP_VERSION = 1;
const APP_NAME = "IT-NT 3108 Block Management System";
const MAX_BACKUP_SIZE = 25 * 1024 * 1024;

// Shared Firestore collections that make up the block system.
// Authentication users/passwords are intentionally NOT included.
const FIRESTORE_COLLECTIONS = [
  "announcements",
  "classroomContents",
  "comments",
  "deadlines",
  "events",
  "gallery_albums",
  "organizations",
  "reactions",
  "schedules",
  "semesters",
  "students",
  "subjects",
  "systemSettings",
];

// Browser-only data such as preferences, personal notes, saved resources,
// grade calculator entries, and local fallbacks.
const EXACT_LOCAL_KEYS = new Set([
  "block_name",
  "resources",
]);

const PERSONAL_DATA_PREFIXES = [
  "deadline-checklist:",
  "deadline-reminders:",
  "grade-calculator:",
  "recently-viewed-subjects:",
  "saved-resources:",
  "subject-notes:",
];

// Old version-1 backups stored shared records in localStorage.
const LEGACY_EXACT_KEYS = new Set([
  "announcements",
  "block_name",
  "deadlines",
  "events",
  "gallery",
  "organizations",
  "resources",
  "schedules",
  "students",
  "subjects",
]);

const isLocalBackupKey = (key) =>
  EXACT_LOCAL_KEYS.has(key) ||
  PERSONAL_DATA_PREFIXES.some((prefix) => key.startsWith(prefix));

const isLegacyBackupKey = (key) =>
  LEGACY_EXACT_KEYS.has(key) ||
  PERSONAL_DATA_PREFIXES.some((prefix) => key.startsWith(prefix));

const parseStoredValue = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const serializeValue = (value) =>
  typeof value === "string" ? value : JSON.stringify(value);

const encodeFirestoreValue = (value) => {
  if (value === null || value === undefined) return value ?? null;

  if (value instanceof Timestamp || typeof value?.toDate === "function") {
    try {
      return { __backupType: "timestamp", value: value.toDate().toISOString() };
    } catch {
      // Continue as a plain object below if it is not actually a Timestamp.
    }
  }

  if (value instanceof GeoPoint || (typeof value?.latitude === "number" && typeof value?.longitude === "number")) {
    return {
      __backupType: "geopoint",
      latitude: value.latitude,
      longitude: value.longitude,
    };
  }

  if (Array.isArray(value)) return value.map(encodeFirestoreValue);

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, encodeFirestoreValue(item)])
    );
  }

  return value;
};

const decodeFirestoreValue = (value) => {
  if (value === null || value === undefined) return value ?? null;

  if (Array.isArray(value)) return value.map(decodeFirestoreValue);

  if (typeof value === "object") {
    if (value.__backupType === "timestamp" && value.value) {
      return Timestamp.fromDate(new Date(value.value));
    }

    if (
      value.__backupType === "geopoint" &&
      typeof value.latitude === "number" &&
      typeof value.longitude === "number"
    ) {
      return new GeoPoint(value.latitude, value.longitude);
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, decodeFirestoreValue(item)])
    );
  }

  return value;
};

const createFileName = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `itnt-3108-full-backup-${timestamp}.json`;
};

const downloadJson = (data, fileName) => {
  const contents = JSON.stringify(data, null, 2);
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const collectLocalBackupData = () => {
  const data = {};

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !isLocalBackupKey(key)) continue;

    const value = localStorage.getItem(key);
    if (value !== null) data[key] = parseStoredValue(value);
  }

  return data;
};

export const collectFirestoreBackupData = async (onProgress) => {
  requireOnline("Server backup export");
  const collections = {};
  let documentCount = 0;

  for (let index = 0; index < FIRESTORE_COLLECTIONS.length; index += 1) {
    const collectionName = FIRESTORE_COLLECTIONS[index];
    onProgress?.({
      phase: "export",
      current: index + 1,
      total: FIRESTORE_COLLECTIONS.length,
      collection: collectionName,
      message: `Reading ${collectionName}...`,
    });

    const snapshot = await getDocs(collection(db, collectionName));
    collections[collectionName] = snapshot.docs.map((item) => ({
      id: item.id,
      data: encodeFirestoreValue(item.data()),
    }));
    documentCount += snapshot.size;
  }

  return { collections, documentCount };
};

export const createBackup = async (onProgress) => {
  const local = collectLocalBackupData();
  const firestore = await collectFirestoreBackupData(onProgress);

  const backup = {
    app: APP_NAME,
    version: BACKUP_VERSION,
    backupType: "full-system",
    exportedAt: new Date().toISOString(),
    firestore: firestore.collections,
    local,
    summary: {
      firestoreCollections: FIRESTORE_COLLECTIONS.length,
      firestoreDocuments: firestore.documentCount,
      localEntries: Object.keys(local).length,
    },
  };

  return backup;
};

export const downloadBackup = async (onProgress) => {
  const backup = await createBackup(onProgress);
  const fileName = createFileName();
  downloadJson(backup, fileName);

  return {
    fileName,
    exportedAt: backup.exportedAt,
    ...backup.summary,
  };
};

const validateVersion2Backup = (backup) => {
  if (!backup.firestore || typeof backup.firestore !== "object" || Array.isArray(backup.firestore)) {
    throw new Error("This backup does not contain valid Firestore data.");
  }

  if (!backup.local || typeof backup.local !== "object" || Array.isArray(backup.local)) {
    throw new Error("This backup does not contain valid local data.");
  }

  const firestore = {};
  let firestoreDocuments = 0;

  for (const collectionName of FIRESTORE_COLLECTIONS) {
    const documents = backup.firestore[collectionName] ?? [];
    if (!Array.isArray(documents)) {
      throw new Error(`Invalid Firestore collection in backup: ${collectionName}.`);
    }

    firestore[collectionName] = documents
      .filter((item) => item && typeof item.id === "string" && item.id && item.data && typeof item.data === "object")
      .map((item) => ({ id: item.id, data: item.data }));
    firestoreDocuments += firestore[collectionName].length;
  }

  const local = Object.fromEntries(
    Object.entries(backup.local).filter(([key]) => isLocalBackupKey(key))
  );

  if (firestoreDocuments === 0 && Object.keys(local).length === 0) {
    throw new Error("No restorable system data was found in this backup.");
  }

  return {
    version: BACKUP_VERSION,
    firestore,
    local,
    summary: {
      firestoreCollections: Object.values(firestore).filter((items) => items.length > 0).length,
      firestoreDocuments,
      localEntries: Object.keys(local).length,
    },
  };
};

const validateLegacyBackup = (backup) => {
  if (!backup.data || typeof backup.data !== "object" || Array.isArray(backup.data)) {
    throw new Error("The legacy backup does not contain valid application data.");
  }

  const local = Object.fromEntries(
    Object.entries(backup.data).filter(([key]) => isLegacyBackupKey(key))
  );

  if (Object.keys(local).length === 0) {
    throw new Error("No restorable application data was found in this legacy backup.");
  }

  return {
    version: LEGACY_BACKUP_VERSION,
    firestore: {},
    local,
    summary: {
      firestoreCollections: 0,
      firestoreDocuments: 0,
      localEntries: Object.keys(local).length,
    },
  };
};

export const validateBackup = (backup) => {
  if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
    throw new Error("The selected file is not a valid backup.");
  }

  if (backup.app !== APP_NAME) {
    throw new Error("This backup belongs to a different application.");
  }

  if (backup.version === BACKUP_VERSION) return validateVersion2Backup(backup);
  if (backup.version === LEGACY_BACKUP_VERSION) return validateLegacyBackup(backup);

  throw new Error(
    `Unsupported backup version. Supported versions: ${LEGACY_BACKUP_VERSION} and ${BACKUP_VERSION}.`
  );
};

export const readBackupFile = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Please choose a backup file."));
      return;
    }

    if (!file.name.toLowerCase().endsWith(".json")) {
      reject(new Error("Please select a JSON backup file."));
      return;
    }

    if (file.size > MAX_BACKUP_SIZE) {
      reject(new Error("The backup file must be smaller than 25 MB."));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const validated = validateBackup(parsed);
        resolve({ backup: parsed, ...validated });
      } catch (error) {
        reject(
          error instanceof SyntaxError
            ? new Error("The selected file contains invalid JSON.")
            : error
        );
      }
    };

    reader.onerror = () => reject(new Error("The backup file could not be read."));
    reader.readAsText(file);
  });

const clearLocalBackupData = () => {
  const keysToRemove = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && (isLocalBackupKey(key) || isLegacyBackupKey(key))) keysToRemove.push(key);
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
};

const restoreLocalData = (localData, mode) => {
  if (mode === "replace") clearLocalBackupData();

  Object.entries(localData).forEach(([key, value]) => {
    // Legacy shared localStorage copies are allowed for backward compatibility.
    if (isLocalBackupKey(key) || isLegacyBackupKey(key)) {
      localStorage.setItem(key, serializeValue(value));
    }
  });
};

const restoreFirestoreData = async (firestoreData, mode, onProgress) => {
  const collectionNames = Object.keys(firestoreData).filter((name) =>
    FIRESTORE_COLLECTIONS.includes(name)
  );
  let restoredDocuments = 0;

  for (let index = 0; index < collectionNames.length; index += 1) {
    const collectionName = collectionNames[index];
    const backupDocuments = firestoreData[collectionName] || [];

    onProgress?.({
      phase: "restore",
      current: index + 1,
      total: collectionNames.length,
      collection: collectionName,
      message: `Restoring ${collectionName}...`,
    });

    if (mode === "replace") {
      const currentSnapshot = await getDocs(collection(db, collectionName));
      await Promise.all(currentSnapshot.docs.map((item) => deleteDoc(item.ref)));
    }

    for (const item of backupDocuments) {
      const targetRef = doc(db, collectionName, item.id);
      const decodedData = decodeFirestoreValue(item.data);

      if (mode === "merge") {
        await setDoc(targetRef, decodedData, { merge: true });
      } else {
        await setDoc(targetRef, decodedData);
      }
      restoredDocuments += 1;
    }
  }

  return restoredDocuments;
};

export const restoreBackup = async (backup, mode = "merge", onProgress) => {
  requireOnline("Backup restore");
  if (mode !== "merge" && mode !== "replace") {
    throw new Error("Invalid restore mode.");
  }

  const validated = validateBackup(backup);

  // Version 1 never contained real Firestore snapshots, so only restore local data.
  const restoredDocuments =
    validated.version === BACKUP_VERSION
      ? await restoreFirestoreData(validated.firestore, mode, onProgress)
      : 0;

  restoreLocalData(validated.local, mode);

  const restoredAt = new Date().toISOString();
  localStorage.setItem("last_backup_restore", restoredAt);

  return {
    restoredAt,
    mode,
    version: validated.version,
    firestoreDocuments: restoredDocuments,
    localEntries: Object.keys(validated.local).length,
  };
};

export const getBackupSummary = () => ({
  localEntries: Object.keys(collectLocalBackupData()).length,
  lastRestoredAt: localStorage.getItem("last_backup_restore"),
  supportedVersion: BACKUP_VERSION,
  firestoreCollections: FIRESTORE_COLLECTIONS.length,
});

export const getBackupCollectionNames = () => [...FIRESTORE_COLLECTIONS];
