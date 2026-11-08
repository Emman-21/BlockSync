import { signOut } from 'firebase/auth';
import { clearIndexedDbPersistence, terminate, waitForPendingWrites } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { hasPendingWork } from './status';
import { clearUserDrafts, savedAccountUid, forgetAccount } from './device';

export async function clearAccountData() {
  let timer;
  let pendingWritesError = hasPendingWork()
    ? new Error('A save is still waiting for server confirmation.')
    : null;
  if (!pendingWritesError) {
    try {
      await Promise.race([waitForPendingWrites(db), new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Saved changes are still awaiting confirmation.')), 3000);
      })]);
    } catch (error) {
      pendingWritesError = error;
    } finally { clearTimeout(timer); }
  }

  const uid = auth.currentUser?.uid || savedAccountUid();
  await signOut(auth);
  try {
    sessionStorage.removeItem('itnt3108-guest-student');
    if (uid) clearUserDrafts(uid);
  } catch (error) {
    markCleanupRequired(error?.message || 'Could not clear saved drafts.');
    location.assign(import.meta.env.BASE_URL);
    return;
  }

  if (pendingWritesError) {
    markCleanupRequired('You are signed out. A save may still be waiting for the server; reconnect before retrying saved-data cleanup.');
    location.assign(import.meta.env.BASE_URL);
    return;
  }

  try {
    await terminate(db);
    await clearIndexedDbPersistence(db);
    forgetAccount();
    sessionStorage.removeItem('itnt3108-cleanup-required');
    location.assign(import.meta.env.BASE_URL);
  } catch {
    markCleanupRequired('You are signed out, but saved app data is still in use. Close other app tabs and retry cleanup.');
    location.assign(import.meta.env.BASE_URL);
  }
}

function markCleanupRequired(message) {
  try {
    sessionStorage.setItem('itnt3108-cleanup-required', 'true');
    sessionStorage.setItem('itnt3108-cleanup-message', message);
  } catch {
    throw new Error('You are signed out, but this browser could not start saved-data cleanup. Reopen the app while online and try again.');
  }
}
