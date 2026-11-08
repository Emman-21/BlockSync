import { beforeEach, describe, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({ save: vi.fn(), subscribe: vi.fn(), import: vi.fn(), read: vi.fn(), remove: vi.fn(), auth: { currentUser: { uid: 'device-a' } } }));
vi.mock('../src/config/firebase', () => ({ auth: fake.auth }));
vi.mock('../src/offline/device', () => ({ draftStorage: () => ({ getItem: fake.read, removeItem: fake.remove }) }));
vi.mock('../src/services/studentProgressService', () => ({
  saveStudentProgress: fake.save, subscribeStudentProgress: fake.subscribe, importStudentProgress: fake.import,
}));
import { useSubmissionsStore } from '../src/store/useSubmissionsStore';
import { useUIStore } from '../src/store/useUIStore';

let receive;
let rejectRead;
let stop;
beforeEach(() => {
  useSubmissionsStore.getState().reset();
  vi.resetAllMocks();
  fake.auth.currentUser = { uid: 'device-a' };
  fake.read.mockReturnValue(null);
  fake.import.mockResolvedValue();
  stop = vi.fn();
  fake.subscribe.mockImplementation((id, next, error) => { receive = next; rejectRead = error; return stop; });
  fake.save.mockImplementation(async (id, deadline, status) => {
    const record = { status: status || 'not_started' };
    receive({ [deadline]: record }, { fromCache: false });
    return record;
  });
  useUIStore.setState({ drumpyyPose: 'idle', drumpyyPraisePending: false, drumpyyCelebrationPending: false });
  useSubmissionsStore.getState().loadStudentSubmissions('roster-student');
  receive({}, { fromCache: false });
});

describe('cloud completion and praise', () => {
  it('waits for server acknowledgement before celebrating or showing completion', async () => {
    let finish;
    fake.save.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const saving = useSubmissionsStore.getState().saveSubmission('roster-student', 'task', 'completed');
    expect(useSubmissionsStore.getState().savingIds.task).toBe(true);
    expect(useSubmissionsStore.getState().getStatus('roster-student', 'task')).toBeNull();
    expect(useUIStore.getState().drumpyyPose).toBe('idle');
    receive({ task: { status: 'completed' } }, { fromCache: false });
    finish({ status: 'completed' });
    await saving;
    expect(useUIStore.getState().drumpyyPose).toBe('proud');
    expect(useSubmissionsStore.getState().getStatus('roster-student', 'task')).toBe('completed');
    expect(useSubmissionsStore.getState().savingIds).toEqual({});
  });

  it('does not celebrate repeated completion or undo', async () => {
    receive({ task: { status: 'completed' } }, { fromCache: false });
    await useSubmissionsStore.getState().saveSubmission('roster-student', 'task', 'completed');
    expect(useUIStore.getState().drumpyyPose).toBe('idle');
    await useSubmissionsStore.getState().saveSubmission('roster-student', 'task', null);
    expect(useSubmissionsStore.getState().getStatus('roster-student', 'task')).toBeNull();
    expect(useUIStore.getState().drumpyyPose).toBe('idle');
  });

  it('preserves confirmed progress and reports rejected saves', async () => {
    receive({ task: { status: 'in_progress' } }, { fromCache: false });
    fake.save.mockRejectedValueOnce(new Error('Permission denied'));
    await expect(useSubmissionsStore.getState().saveSubmission('roster-student', 'task', 'completed')).rejects.toThrow('Permission denied');
    expect(useSubmissionsStore.getState().getStatus('roster-student', 'task')).toBe('in_progress');
    expect(useSubmissionsStore.getState().errorMessage).toBe('Permission denied');
    expect(useSubmissionsStore.getState().savingIds).toEqual({});
    expect(useUIStore.getState().drumpyyPose).toBe('idle');
  });

  it('restores the same roster progress after the anonymous device UID changes', () => {
    useSubmissionsStore.getState().reset();
    fake.auth.currentUser = { uid: 'device-b' };
    useSubmissionsStore.getState().loadStudentSubmissions('roster-student');
    receive({ 'classroom-work': { status: 'completed' } }, { fromCache: false });
    expect(fake.subscribe).toHaveBeenLastCalledWith('roster-student', expect.any(Function), expect.any(Function));
    expect(useSubmissionsStore.getState().getStatus('roster-student', 'classroom-work')).toBe('completed');
    expect(useSubmissionsStore.getState().getStatus('device-a', 'classroom-work')).toBeNull();
  });

  it('updates completion and undo from a live remote snapshot without celebrating', () => {
    receive({ task: { status: 'completed' } }, { fromCache: false });
    expect(useSubmissionsStore.getState().getStatus('roster-student', 'task')).toBe('completed');
    receive({ task: { status: 'not_started' } }, { fromCache: false });
    expect(useSubmissionsStore.getState().getStatus('roster-student', 'task')).toBeNull();
    expect(useUIStore.getState().drumpyyPose).toBe('idle');
  });

  it('unsubscribes and ignores stale reads/writes when switching profiles', async () => {
    const oldReceive = receive;
    let finish;
    fake.save.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const saving = useSubmissionsStore.getState().saveSubmission('roster-student', 'task', 'completed');
    useSubmissionsStore.getState().loadStudentSubmissions('other-student');
    expect(stop).toHaveBeenCalled();
    oldReceive({ task: { status: 'completed' } }, { fromCache: false });
    finish({ status: 'completed' });
    await saving;
    expect(useSubmissionsStore.getState().submissions).toEqual({});
    expect(useUIStore.getState().drumpyyPose).toBe('idle');
  });

  it('clears cached records if cloud access is denied', () => {
    receive({ task: { status: 'completed' } }, { fromCache: false });
    rejectRead({ code: 'permission-denied', message: 'Access denied' });
    expect(useSubmissionsStore.getState().submissions).toEqual({});
    expect(useSubmissionsStore.getState().errorMessage).toBe('Access denied');
  });

  it('imports only current-session legacy marks after the first server snapshot', async () => {
    fake.read.mockReturnValue(JSON.stringify({
      'device-a_task': { status: 'completed' }, 'other-uid_task': { status: 'completed' },
    }));
    useSubmissionsStore.getState().loadStudentSubmissions('roster-student');
    receive({}, { fromCache: true });
    expect(fake.import).not.toHaveBeenCalled();
    receive({}, { fromCache: false });
    await vi.waitFor(() => expect(useSubmissionsStore.getState().loading).toBe(false));
    expect(fake.import).toHaveBeenCalledWith('roster-student', { task: { status: 'completed' } }, 'device-a');
    expect(fake.remove).toHaveBeenCalledWith('itnt3108-draft-v1:device-a:completion');
  });
});
