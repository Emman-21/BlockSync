import {
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../config/firebase";

const COLLECTION_NAME = "firebaseUsageDaily";
const STORAGE_KEY = "itnt3108-firebase-usage-buffer";
const FLUSH_DELAY_MS = 30_000;

const emptyUsage = () => ({ reads: 0, writes: 0, deletes: 0 });

const dateKey = (date = new Date()) => date.toISOString().slice(0, 10);

const readBuffer = () => {
  try {
    return { ...emptyUsage(), ...JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return emptyUsage();
  }
};

const saveBuffer = (usage) => {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(usage)); } catch { /* Best-effort telemetry. */ }
};

let buffer = typeof window === "undefined" ? emptyUsage() : readBuffer();
let flushTimer = null;
let flushing = false;

const positiveInteger = (value) => Math.max(0, Math.round(Number(value) || 0));

export const flushFirebaseUsage = async () => {
  if (flushing || !auth.currentUser || !navigator.onLine) return;

  const pending = { ...buffer };
  if (!pending.reads && !pending.writes && !pending.deletes) return;

  buffer = emptyUsage();
  saveBuffer(buffer);
  flushing = true;

  try {
    // The counter update is itself one Firestore write, so include it.
    await setDoc(
      doc(db, COLLECTION_NAME, dateKey()),
      {
        day: dateKey(),
        reads: increment(pending.reads),
        writes: increment(pending.writes + 1),
        deletes: increment(pending.deletes),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    buffer = {
      reads: buffer.reads + pending.reads,
      writes: buffer.writes + pending.writes,
      deletes: buffer.deletes + pending.deletes,
    };
    saveBuffer(buffer);
    console.warn("Firebase usage counters could not be synchronized:", error);
  } finally {
    flushing = false;
  }
};

const scheduleFlush = () => {
  if (flushTimer || typeof window === "undefined") return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushFirebaseUsage();
  }, FLUSH_DELAY_MS);
};

export const recordFirebaseUsage = ({ reads = 0, writes = 0, deletes = 0 } = {}) => {
  buffer = {
    reads: buffer.reads + positiveInteger(reads),
    writes: buffer.writes + positiveInteger(writes),
    deletes: buffer.deletes + positiveInteger(deletes),
  };
  saveBuffer(buffer);
  scheduleFlush();
};

export const subscribeFirebaseUsage = (onData, onError) => {
  const usageQuery = query(
    collection(db, COLLECTION_NAME),
    orderBy("day", "desc"),
    limit(31)
  );

  return onSnapshot(
    usageQuery,
    (snapshot) => {
      const history = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      const today = history.find((item) => item.day === dateKey()) || emptyUsage();
      onData({
        reads: positiveInteger(today.reads),
        writes: positiveInteger(today.writes),
        deletes: positiveInteger(today.deletes),
        history,
      });
    },
    onError
  );
};

if (typeof window !== "undefined") {
  window.addEventListener("online", () => void flushFirebaseUsage());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flushFirebaseUsage();
  });
}
