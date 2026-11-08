import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({ auth: { currentUser: { uid: 'anonymous-a' } }, setDoc: vi.fn(), onSnapshot: vi.fn(), runTransaction: vi.fn() }));
vi.mock('../src/config/firebase', () => ({ auth: fake.auth, db: {} }));
vi.mock('../src/services/trackedFirestore', () => ({
  doc: (_, ...parts) => parts.join('/'), collection: (_, ...parts) => parts.join('/'),
  setDoc: fake.setDoc, onSnapshot: fake.onSnapshot, runTransaction: fake.runTransaction,
  serverTimestamp: () => 'server-time',
}));
vi.mock('../src/offline/status', () => ({ trackWrite: operation => operation() }));
import { importStudentProgress, saveStudentProgress, subscribeStudentProgress } from '../src/services/studentProgressService';
afterEach(() => vi.unstubAllGlobals());

beforeEach(() => {
  vi.resetAllMocks();
  fake.auth.currentUser = { uid: 'anonymous-a' };
  vi.stubGlobal('navigator', { onLine: true });
  fake.setDoc.mockResolvedValue();
});

it('writes progress to the stable roster ID regardless of anonymous device UID', async () => {
  await saveStudentProgress('roster', 'classroom-work', 'completed');
  fake.auth.currentUser = { uid: 'anonymous-b' };
  await saveStudentProgress('roster', 'classroom-work', null);
  expect(fake.setDoc.mock.calls.map(call => call[0])).toEqual([
    'studentProgress/roster/deadlines/classroom-work', 'studentProgress/roster/deadlines/classroom-work',
  ]);
  expect(fake.setDoc.mock.calls[0][1]).toEqual({ source: 'classroomContents', sourceId: 'work', status: 'completed', updatedBy: 'anonymous-a', updatedAt: 'server-time' });
  expect(fake.setDoc.mock.calls[1][1]).toMatchObject({ status: 'not_started', updatedBy: 'anonymous-b' });
});

it.each([
  ['regular', 'deadlines', 'regular'], ['exam-schedule-exam', 'schedules', 'exam'],
])('maps %s to the correct activity', async (id, source, sourceId) => {
  await saveStudentProgress('roster', id, 'in_progress');
  expect(fake.setDoc.mock.calls[0][1]).toMatchObject({ source, sourceId });
});

it('does not publish a pending local snapshot as saved progress', () => {
  const receive = vi.fn();
  subscribeStudentProgress('roster', receive, vi.fn());
  const next = fake.onSnapshot.mock.calls[0][1];
  const snapshot = { metadata: { hasPendingWrites: true, fromCache: true }, docs: [{ id: 'task', data: () => ({ status: 'completed' }) }] };
  next(snapshot);
  expect(receive).not.toHaveBeenCalled();
  next({ ...snapshot, metadata: { hasPendingWrites: false, fromCache: false } });
  expect(receive).toHaveBeenCalledWith({ task: { status: 'completed' } }, { fromCache: false });
});

it('refuses offline, signed-out, invalid-status and invalid-path writes', async () => {
  vi.stubGlobal('navigator', { onLine: false });
  await expect(saveStudentProgress('roster', 'task', 'completed')).rejects.toThrow('Reconnect');
  vi.stubGlobal('navigator', { onLine: true });
  fake.auth.currentUser = null;
  await expect(saveStudentProgress('roster', 'task', 'completed')).rejects.toThrow('Sign in');
  fake.auth.currentUser = { uid: 'anonymous-a' };
  await expect(saveStudentProgress('roster', 'task', 'admin')).rejects.toThrow('Invalid');
  await expect(saveStudentProgress('other/path', 'task', 'completed')).rejects.toThrow('valid');
  expect(fake.setDoc).not.toHaveBeenCalled();
});

it('imports old marks only when the cloud record is missing and the activity still exists', async () => {
  const transaction = { get: vi.fn(), set: vi.fn() };
  transaction.get.mockImplementation(async reference => ({
    exists: () => reference.includes('existing') || !reference.startsWith('studentProgress/'),
    data: () => ({ status: 'not_started' }),
  }));
  fake.runTransaction.mockImplementation((_, action) => action(transaction));
  await importStudentProgress('roster', { existing: { status: 'completed' }, missing: { status: 'completed' } });
  expect(transaction.set).toHaveBeenCalledOnce();
  expect(transaction.set.mock.calls[0][0]).toBe('studentProgress/roster/deadlines/missing');
});

it('stops a legacy import if the authenticated session changed', async () => {
  await importStudentProgress('roster', { task: { status: 'completed' } }, 'old-session');
  expect(fake.runTransaction).not.toHaveBeenCalled();
});
