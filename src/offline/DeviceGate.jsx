import { Component, lazy, Suspense, useState } from 'react';
import { clearUserDrafts, forgetAccount, savedAccountUid } from './device';
const App = lazy(() => import('../App'));
class StartupBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="p-8"><h1>Unable to open the app</h1><p>Check your Firebase setup. If this is your first visit, connect to the internet and reload.</p><button onClick={() => location.reload()}>Reload</button></main>;
    return this.props.children;
  }
}
export default function DeviceGate() {
  let cleanupRequired = false;
  try { cleanupRequired = sessionStorage.getItem('itnt3108-cleanup-required') === 'true'; } catch { /* Storage unavailable. */ }
  if (cleanupRequired) return <CleanupScreen />;
  return <StartupBoundary><Suspense fallback={<p className="p-8" role="status">Opening your block…</p>}><App /></Suspense></StartupBoundary>;
}

function CleanupScreen() {
  const [message, setMessage] = useState(() => {
    try {
      return sessionStorage.getItem('itnt3108-cleanup-message')
        || 'You are signed out. Close other tabs of this app, then retry to clear saved account data from this device.';
    } catch {
      return 'You are signed out. Retry to clear saved account data from this device.';
    }
  });
  const [retrying, setRetrying] = useState(false);
  async function retry() {
    if (retrying) return;
    setRetrying(true);
    try {
      const { db } = await import('../config/firebase');
      const { terminate, clearIndexedDbPersistence } = await import('firebase/firestore');
      await terminate(db);
      await clearIndexedDbPersistence(db);
      const uid = savedAccountUid();
      if (uid) clearUserDrafts(uid);
      forgetAccount();
      sessionStorage.removeItem('itnt3108-cleanup-required');
      sessionStorage.removeItem('itnt3108-cleanup-message');
      location.reload();
    } catch (error) {
      setMessage(error?.message || 'Saved data is still in use. Close other app tabs and retry.');
      setRetrying(false);
    }
  }
  return <main className="min-h-dvh grid place-items-center bg-bg-primary p-6"><section className="w-full max-w-lg rounded-3xl border border-border bg-bg-surface p-6 shadow-card"><h1 className="text-2xl font-semibold">You’re signed out</h1><p className="my-4 text-text-secondary" role="status">{message}</p><button disabled={retrying} className="w-full rounded-xl bg-accent p-3 text-white disabled:opacity-50" onClick={retry}>{retrying ? 'Clearing saved data…' : 'Retry cleanup'}</button></section></main>;
}
