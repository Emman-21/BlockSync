export const DEVICE_KEY = 'itnt3108-device-v1';
let choice;
export function deviceChoice() {
  if (choice) return choice;
  try { return localStorage.getItem(DEVICE_KEY); } catch { return null; }
}
export function chooseDevice(value) {
  choice = value;
  try { localStorage.setItem(DEVICE_KEY, value); } catch { choice = 'shared'; }
  return choice;
}
export const isTrustedDevice = () => deviceChoice() === 'trusted';
export function draftStorage() { return isTrustedDevice() ? localStorage : sessionStorage; }
export function draftKey(uid, scope) {
  if (!uid || !scope) throw new Error('A signed-in user and draft scope are required.');
  return `itnt3108-draft-v1:${encodeURIComponent(uid)}:${encodeURIComponent(scope)}`;
}
export function readDraft(uid, scope) {
  try { return JSON.parse(draftStorage().getItem(draftKey(uid, scope)) || 'null'); }
  catch { return null; }
}
export function saveDraft(uid, scope, value) {
  const record = { value, savedAt: new Date().toISOString() };
  const text = JSON.stringify(record);
  if (text.length > 200000) throw new Error('Draft is too large. Keep attachments online.');
  try { draftStorage().setItem(draftKey(uid, scope), text); }
  catch { throw new Error('Draft could not be saved. Browser storage is full or unavailable. Copy your text before leaving.'); }
  return record;
}
export function removeDraft(uid, scope) { draftStorage().removeItem(draftKey(uid, scope)); }
export function clearUserDrafts(uid) {
  const prefix = `itnt3108-draft-v1:${encodeURIComponent(uid)}:`;
  for (const name of ['localStorage', 'sessionStorage']) {
    let storage;
    try { storage = globalThis[name]; } catch { continue; }
    Object.keys(storage).filter(key => key.startsWith(prefix)).forEach(key => storage.removeItem(key));
  }
}

const ACCOUNT_KEY = 'itnt3108-saved-account-v1';
let accountUid = '';
export function savedAccountUid() {
  try { return accountUid || draftStorage().getItem(ACCOUNT_KEY) || ''; } catch { return accountUid; }
}
export function rememberAccount(uid) {
  accountUid = uid;
  try { draftStorage().setItem(ACCOUNT_KEY, uid); } catch { /* Memory-only devices keep the current UID in memory. */ }
}
export function forgetAccount() {
  accountUid = '';
  try { draftStorage().removeItem(ACCOUNT_KEY); } catch { /* Storage may be unavailable. */ }
}
