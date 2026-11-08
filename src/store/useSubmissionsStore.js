import { create } from 'zustand';
import { auth } from '../config/firebase';
import { draftStorage } from '../offline/device';
import { useUIStore } from './useUIStore';
import { importStudentProgress, saveStudentProgress, subscribeStudentProgress } from '../services/studentProgressService';

function legacyProgress(uid) {
  if (!uid) return {};
  try {
    const data = JSON.parse(draftStorage().getItem(`itnt3108-draft-v1:${encodeURIComponent(uid)}:completion`) || '{}');
    const prefix = `${uid}_`;
    return Object.fromEntries(Object.entries(data).filter(([key, value]) =>
      key.startsWith(prefix) && ['completed', 'in_progress'].includes(value?.status)
    ).map(([key, value]) => [key.slice(prefix.length), value]));
  } catch {
    return {};
  }
}

export const createSubmissionsStore = () => {
  let generation = 0;
  let unsubscribe = null;
  return create((set, get) => ({
    submissions: {},
    activeStudentId: null,
    loading: false,
    errorMessage: '',
    savingIds: {},

    loadStudentSubmissions: (studentId) => {
      const current = ++generation;
      unsubscribe?.();
      unsubscribe = null;
      const uid = auth.currentUser?.uid;
      const isCurrent = () => current === generation && auth.currentUser?.uid === uid;
      set({ activeStudentId: studentId || null, submissions: {}, savingIds: {}, loading: Boolean(studentId), errorMessage: '' });
      if (!studentId) {
        set({ errorMessage: 'Select your registered student profile to sync progress.' });
        return () => {};
      }

      let triedImport = false;
      let importing = false;
      const onError = error => {
        if (!isCurrent()) return;
        const denied = ['permission-denied', 'unauthenticated'].includes(error?.code);
        set({
          ...(denied ? { submissions: {} } : {}),
          loading: false,
          errorMessage: error?.message || 'Unable to load saved progress. Reconnect and reopen this page.',
        });
      };
      try {
        unsubscribe = subscribeStudentProgress(studentId, (records, metadata) => {
          if (!isCurrent()) return;
          set({
            submissions: Object.fromEntries(Object.entries(records).map(([id, record]) => [`${studentId}_${id}`, record])),
            loading: importing || (metadata.fromCache && !Object.keys(records).length && typeof navigator !== 'undefined' && navigator.onLine),
            errorMessage: '',
          });
          if (!metadata.fromCache && !triedImport) {
            triedImport = true;
            const legacy = legacyProgress(uid);
            if (Object.keys(legacy).length) {
              importing = true;
              set({ loading: true });
              void importStudentProgress(studentId, legacy, uid).then(() => {
                if (isCurrent()) {
                  try { draftStorage().removeItem(`itnt3108-draft-v1:${encodeURIComponent(uid)}:completion`); } catch { /* Safe to retry: cloud records always win. */ }
                }
              }).catch(error => {
                if (isCurrent()) set({ errorMessage: `Old device progress could not be imported: ${error.message}` });
              }).finally(() => {
                importing = false;
                if (isCurrent()) set({ loading: false });
              });
            }
          }
        }, onError);
      } catch (error) {
        onError(error);
      }
      return () => {
        if (current !== generation) return;
        get().reset();
      };
    },

    saveSubmission: async (studentId, deadlineId, status) => {
      if (!studentId || !deadlineId || get().activeStudentId !== studentId) {
        const error = new Error('Reopen your student profile before saving progress.');
        set({ errorMessage: error.message });
        throw error;
      }
      if (get().loading || get().savingIds[deadlineId]) return;
      const current = generation;
      const uid = auth.currentUser?.uid;
      const isCurrent = () => current === generation && auth.currentUser?.uid === uid;
      const key = `${studentId}_${deadlineId}`;
      const wasCompleted = get().submissions[key]?.status === 'completed';
      set(state => ({ savingIds: { ...state.savingIds, [deadlineId]: true }, errorMessage: '' }));
      try {
        const record = await saveStudentProgress(studentId, deadlineId, status);
        if (isCurrent()) {
          // The live subscription owns the status, including writes from other devices.
          if (record.status === 'completed' && !wasCompleted) useUIStore.getState().praiseDrumpyy();
        }
        return record;
      } catch (error) {
        if (isCurrent()) set({ errorMessage: error.message || 'Your progress could not be saved. Try again.' });
        throw error;
      } finally {
        if (isCurrent()) set(state => {
          const savingIds = { ...state.savingIds };
          delete savingIds[deadlineId];
          return { savingIds };
        });
      }
    },

    getStatus: (studentId, deadlineId) => {
      if (get().activeStudentId !== studentId) return null;
      const status = get().submissions[`${studentId}_${deadlineId}`]?.status;
      return status === 'not_started' ? null : status || null;
    },

    reset: () => {
      generation++;
      unsubscribe?.();
      unsubscribe = null;
      set({ submissions: {}, activeStudentId: null, loading: false, errorMessage: '', savingIds: {} });
    },
  }));
};

export const useSubmissionsStore = createSubmissionsStore();
