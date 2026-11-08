import { create } from 'zustand';
export const useConnection = create(() => ({
  online: typeof navigator === 'undefined' || navigator.onLine,
  pending: 0, sources: {}, writeError: '', lastSynced: null,
}));
export function requireOnline(action = 'Saving changes') {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw Object.assign(new Error(`${action} requires a connection. Your draft is saved automatically; try again when online.`), { code: 'app/offline' });
  }
}
export const sourceState = (key, value) => useConnection.setState(state => ({ sources: { ...state.sources, [key]: value } }));
export function removeSource(key) {
  useConnection.setState(state => { const sources = { ...state.sources }; delete sources[key]; return { sources }; });
}
export function hasPendingWork() {
  const state = useConnection.getState();
  return state.pending > 0 || Object.values(state.sources).some(source => source.pending);
}
export function assertNoPendingWork() {
  if (hasPendingWork()) throw new Error('A save is still waiting for server confirmation. Reconnect and wait before signing out, switching accounts, or clearing data.');
}
export async function trackWrite(operation) {
  requireOnline();
  useConnection.setState(state => ({ pending: state.pending + 1, writeError: '' }));
  try {
    const result = await operation();
    useConnection.setState({ lastSynced: new Date().toISOString() });
    return result;
  } catch (error) {
    useConnection.setState({ writeError: error.message || 'Could not sync.' });
    throw error;
  } finally { useConnection.setState(state => ({ pending: Math.max(0, state.pending - 1) })); }
}
if (typeof window !== 'undefined') {
  for (const event of ['online', 'offline']) window.addEventListener(event, () => useConnection.setState({ online: navigator.onLine }));
  window.addEventListener('beforeunload', event => {
    if (hasPendingWork()) { event.preventDefault(); event.returnValue = ''; }
  });
}
