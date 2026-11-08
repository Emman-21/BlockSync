import { auth, db } from '../config/firebase';
import { collection, doc, onSnapshot, runTransaction, serverTimestamp, setDoc } from './trackedFirestore';
import { trackWrite } from '../offline/status';

const validateId = (id) => {
  if (typeof id !== 'string' || !id || id.includes('/') || id === '.' || id === '..') {
    throw new Error('A valid student profile and activity are required.');
  }
  return id;
};

const progressRef = (studentId, deadlineId) =>
  doc(db, 'studentProgress', validateId(studentId), 'deadlines', validateId(deadlineId));

const targetFor = (deadlineId) => {
  if (deadlineId.startsWith('classroom-')) return { source: 'classroomContents', sourceId: deadlineId.slice(10) };
  if (deadlineId.startsWith('exam-schedule-')) return { source: 'schedules', sourceId: deadlineId.slice(14) };
  return { source: 'deadlines', sourceId: deadlineId };
};

function progressData(deadlineId, status) {
  const nextStatus = status == null || status === '' ? 'not_started' : status;
  if (!['not_started', 'in_progress', 'completed'].includes(nextStatus)) {
    throw new Error('Invalid checklist status.');
  }
  if (!auth.currentUser) throw new Error('Sign in to save your progress.');
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Reconnect to save your progress across devices. No change was saved.');
  }
  const target = targetFor(validateId(deadlineId));
  validateId(target.sourceId);
  return { ...target, status: nextStatus, updatedBy: auth.currentUser.uid, updatedAt: serverTimestamp() };
}

export function subscribeStudentProgress(studentId, onData, onError) {
  return onSnapshot(collection(db, 'studentProgress', validateId(studentId), 'deadlines'), snapshot => {
    // Do not report an optimistic local write as a confirmed cloud save.
    if (snapshot.metadata.hasPendingWrites) return;
    const records = Object.fromEntries(snapshot.docs.map(item => [item.id, item.data()]));
    onData(records, { fromCache: snapshot.metadata.fromCache });
  }, onError);
}

export async function saveStudentProgress(studentId, deadlineId, status) {
  const reference = progressRef(studentId, deadlineId);
  const data = progressData(deadlineId, status);
  await setDoc(reference, data);
  return { ...data, updatedAt: new Date().toISOString() };
}

// Existing cloud records, including an undo, win over old browser-only marks.
export async function importStudentProgress(studentId, legacyRecords, expectedUid = auth.currentUser?.uid) {
  for (const [deadlineId, record] of Object.entries(legacyRecords)) {
    if (!expectedUid || auth.currentUser?.uid !== expectedUid) return;
    const reference = progressRef(studentId, deadlineId);
    const data = progressData(deadlineId, record.status);
    await trackWrite(() => runTransaction(db, async transaction => {
      const existing = await transaction.get(reference);
      if (existing.exists()) return;
      const activity = await transaction.get(doc(db, data.source, data.sourceId));
      if (!activity.exists()) return;
      if (data.source === 'classroomContents' && activity.data().contentType !== 'coursework') return;
      if (data.source === 'schedules' && activity.data().scheduleKind !== 'exam') return;
      if (auth.currentUser?.uid !== expectedUid) return;
      transaction.set(reference, data);
    }));
  }
}
