import { db } from "../config/firebase";
import { doc, onSnapshot, serverTimestamp, setDoc } from "./trackedFirestore";
import { BRANDING as defaults } from "../config/branding";
import { applySection, normalizeSection } from "../store/brandingStore";

const reference = () => doc(db, "systemSettings", "branding");

// A live listener is required so already-open pages update for every user.
export function subscribeBranding(onError) {
  return onSnapshot(reference(), (snapshot) => {
    // Publish only committed changes; a rejected admin write must not rename the UI.
    if (snapshot.metadata.hasPendingWrites) return;
    try {
      applySection(snapshot.exists() ? snapshot.data().section : defaults.section);
    } catch (error) {
      onError?.(error);
    }
  }, onError);
}

export async function saveSection(value) {
  const section = normalizeSection(value);
  await setDoc(reference(), { section, updatedAt: serverTimestamp() }, { merge: true });
  applySection(section);
}
