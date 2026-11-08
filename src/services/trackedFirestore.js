import * as firestore from 'firebase/firestore';
import { recordFirebaseUsage } from './firebaseUsageService';
import { trackWrite, sourceState, removeSource, requireOnline } from '../offline/status';
export * from 'firebase/firestore';

export const getDoc = async (...args) => {
  const snapshot = await (navigator.onLine ? firestore.getDoc(...args) : firestore.getDocFromCache(...args));
  if (!snapshot.metadata.fromCache) recordFirebaseUsage({ reads: 1 });
  return snapshot;
};
export const getDocs = async (...args) => {
  const snapshot = await (navigator.onLine ? firestore.getDocs(...args) : firestore.getDocsFromCache(...args));
  if (!snapshot.metadata.fromCache) recordFirebaseUsage({ reads: Math.max(1, snapshot.size) });
  return snapshot;
};
function write(method, usage, args) {
  return trackWrite(async () => {
    const result = await firestore[method](...args);
    recordFirebaseUsage(usage);
    return result;
  });
}
export const addDoc = (...args) => write('addDoc', { writes: 1 }, args);
export const setDoc = (...args) => write('setDoc', { writes: 1 }, args);
export const updateDoc = (...args) => write('updateDoc', { writes: 1 }, args);
export const deleteDoc = (...args) => write('deleteDoc', { deletes: 1 }, args);
export const writeBatch = (...args) => {
  requireOnline('Bulk changes');
  const batch = firestore.writeBatch(...args);
  const commit = batch.commit.bind(batch);
  batch.commit = () => trackWrite(commit);
  return batch;
};
let subscriptionId = 0;
export const onSnapshot = (reference, onNext, onError, onCompletion) => {
  const key = String(++subscriptionId);
  let initializedOnServer = false;
  sourceState(key, { path: reference.path || reference._query?.path?.canonicalString() || 'records', loading: true });
  const unsubscribe = firestore.onSnapshot(reference, { includeMetadataChanges: true }, snapshot => {
    sourceState(key, {
      path: reference.path || reference._query?.path?.canonicalString() || 'records',
      cached: snapshot.metadata.fromCache, pending: snapshot.metadata.hasPendingWrites,
      empty: snapshot.empty ?? !snapshot.exists(), loading: false,
      // Empty cached queries do not prove the collection is empty on the server.
      error: '',
    });
    if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) {
      const count = snapshot.docs ? (initializedOnServer ? snapshot.docChanges().length : Math.max(1, snapshot.size)) : (initializedOnServer ? 0 : 1);
      if (count) recordFirebaseUsage({ reads: count });
      initializedOnServer = true;
    }
    onNext(snapshot);
  }, error => {
    sourceState(key, { loading: false, error: error.message, denied: ['permission-denied', 'unauthenticated'].includes(error.code) });
    onError?.(error);
  }, onCompletion);
  return () => { unsubscribe(); removeSource(key); };
};
