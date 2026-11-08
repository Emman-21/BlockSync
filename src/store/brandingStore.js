import { useSyncExternalStore } from "react";
import { BRANDING as defaults } from "../config/branding";

export function normalizeSection(value) {
  const section = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!section || section.length > 60) throw new Error("Enter a section name between 1 and 60 characters.");
  return section;
}

export let BRANDING = defaults;
export let APP_TITLE = `${BRANDING.name} | ${BRANDING.section}`;
let snapshot = { BRANDING, APP_TITLE };
const listeners = new Set();
export function applySection(value) {
  const section = normalizeSection(value);
  if (section === BRANDING.section) return;
  BRANDING = Object.freeze({ ...defaults, section });
  APP_TITLE = `${BRANDING.name} | ${section}`;
  snapshot = { BRANDING, APP_TITLE };
  listeners.forEach((listener) => listener());
}
const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
const getSnapshot = () => snapshot;
export function useBranding() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
