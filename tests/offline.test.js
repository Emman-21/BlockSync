import { beforeEach, describe, expect, it, vi } from 'vitest';
import { profileDecision } from '../src/offline/profilePolicy';
const fake = vi.hoisted(() => ({ getDoc: vi.fn(), getDocFromCache: vi.fn(), getDocs: vi.fn(), getDocsFromCache: vi.fn(), addDoc: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(), onSnapshot: vi.fn(), writeBatch: vi.fn() }));
vi.mock('firebase/firestore', () => fake);
vi.mock('../src/services/firebaseUsageService', () => ({ recordFirebaseUsage: vi.fn() }));
import { recordFirebaseUsage } from '../src/services/firebaseUsageService';
import { addDoc, getDoc, onSnapshot } from '../src/services/trackedFirestore';
import { useConnection, hasPendingWork, assertNoPendingWork } from '../src/offline/status';
import { chooseDevice, readDraft, saveDraft, clearUserDrafts, savedAccountUid, rememberAccount, forgetAccount } from '../src/offline/device';
function storage() {
  const data = {};
  return new Proxy({
    getItem: key => data[key] ?? null,
    setItem: (key, value) => { data[key] = String(value); },
    removeItem: key => { delete data[key]; },
  }, { ownKeys: () => Object.keys(data), getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('localStorage', storage()); vi.stubGlobal('sessionStorage', storage());
  chooseDevice('trusted');
  forgetAccount();
  useConnection.setState({ pending: 0, sources: {}, writeError: '', lastSynced: null });
});
describe('draft ownership', () => {
  it('retains the cache owner after authentication ends until cleanup completes', () => {
    rememberAccount('alice');
    expect(savedAccountUid()).toBe('alice');
    forgetAccount();
    expect(savedAccountUid()).toBe('');
  });
  it('survives a read but cannot be read under another UID or term', () => {
    saveDraft('alice', 'term1:deadlines', { title: 'Lab' });
    expect(readDraft('alice', 'term1:deadlines').value.title).toBe('Lab');
    expect(readDraft('bob', 'term1:deadlines')).toBeNull();
    expect(readDraft('alice', 'term2:deadlines')).toBeNull();
    clearUserDrafts('bob');
    expect(readDraft('alice', 'term1:deadlines')).not.toBeNull();
    clearUserDrafts('alice'); expect(readDraft('alice', 'term1:deadlines')).toBeNull();
  });
  it('uses session storage on shared devices and reports quota failures', () => {
    chooseDevice('shared'); saveDraft('alice', 'notes', 'hello');
    expect(Object.keys(localStorage).filter(k => k.includes('draft'))).toHaveLength(0);
    expect(readDraft('alice', 'notes').value).toBe('hello');
    vi.stubGlobal('sessionStorage', { setItem: () => { throw new Error('quota'); } });
    expect(() => saveDraft('alice', 'notes', 'new')).toThrow('could not be saved');
  });
});
describe('server confirmation and caching', () => {
  it('does not send an offline write to Firebase', async () => {
    navigator.onLine = false;
    await expect(addDoc({}, {})).rejects.toThrow('requires a connection');
    expect(fake.addDoc).not.toHaveBeenCalled(); expect(hasPendingWork()).toBe(false);
  });
  it('keeps a save pending until acknowledged, blocks account switching, and sends only once', async () => {
    let accept; fake.addDoc.mockImplementation(() => new Promise(resolve => { accept = resolve; }));
    const saving = addDoc({}, {});
    expect(hasPendingWork()).toBe(true); expect(() => assertNoPendingWork()).toThrow();
    expect(useConnection.getState().lastSynced).toBeNull();
    navigator.onLine = false;
    accept({ id: 'stable-id' });
    await expect(saving).resolves.toEqual({ id: 'stable-id' });
    expect(fake.addDoc).toHaveBeenCalledTimes(1); expect(hasPendingWork()).toBe(false);
  });
  it('exposes server rejection without claiming sync success', async () => {
    fake.addDoc.mockRejectedValue(new Error('Permission denied'));
    await expect(addDoc({}, {})).rejects.toThrow('Permission denied');
    expect(useConnection.getState().writeError).toBe('Permission denied');
    expect(useConnection.getState().lastSynced).toBeNull();
    expect(hasPendingWork()).toBe(false);
  });
  it('uses the cached read offline and excludes it from usage counters', async () => {
    navigator.onLine = false;
    fake.getDocFromCache.mockResolvedValue({ metadata: { fromCache: true } });
    await getDoc({}); expect(fake.getDoc).not.toHaveBeenCalled();
    expect(recordFirebaseUsage).not.toHaveBeenCalled();
  });
  it('distinguishes empty cache, pending records, server confirmation and metadata-only events', () => {
    let next; fake.onSnapshot.mockImplementation((ref, opts, callback) => { next = callback; return vi.fn(); });
    const stop = onSnapshot({ path: 'deadlines' }, vi.fn());
    const snapshot = (cached, pending, changes = []) => ({ docs: [], size: 0, empty: true, metadata: { fromCache: cached, hasPendingWrites: pending }, docChanges: () => changes });
    next(snapshot(true, false));
    expect(Object.values(useConnection.getState().sources)[0]).toMatchObject({ cached: true, empty: true });
    expect(recordFirebaseUsage).not.toHaveBeenCalled();
    next(snapshot(true, true)); expect(hasPendingWork()).toBe(true);
    next(snapshot(false, false)); expect(hasPendingWork()).toBe(false);
    next(snapshot(false, false)); expect(recordFirebaseUsage).toHaveBeenCalledTimes(1);
    stop(); expect(Object.keys(useConnection.getState().sources)).toHaveLength(0);
  });
});
describe('profile recovery', () => {
  const snapshot = (exists, cached, data = {}) => ({ exists: () => exists, data: () => data, metadata: { fromCache: cached } });
  it('keeps the identity when the offline profile is missing', () => {
    expect(profileDecision(snapshot(false, true))).toBe('unavailable');
  });
  it('accepts an active cached profile, and revokes a server-disabled role', () => {
    expect(profileDecision(snapshot(true, true, { active: true, role: 'admin' }))).toBe('available');
    expect(profileDecision(snapshot(true, false, { active: false, role: 'admin' }))).toBe('revoked');
    expect(profileDecision(snapshot(false, false))).toBe('revoked');
  });
});
