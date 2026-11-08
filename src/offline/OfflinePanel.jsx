import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useAuth } from '../context/AuthContext';
import { useConnection, hasPendingWork } from './status';
import { isTrustedDevice, savedAccountUid } from './device';
import DraftControls from './DraftControls';
import Modal from '../components/ui/Modal';

function Notes({ scope }) {
  const [text, setText] = useState('');
  return <div className="space-y-3">
    <label className="block">Notes for this page<textarea aria-label="Local draft notes" className="mt-2 w-full min-h-32 p-3 rounded-xl bg-bg-muted" value={text} onChange={event => setText(event.target.value)} maxLength={50000} /></label>
    <DraftControls scope={scope} value={text} onRestore={value => setText(typeof value === 'string' ? value : '')} />
  </div>;
}
export default function OfflinePanel() {
  const state = useConnection();
  const { user, firebaseUser, logout } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [semester, setSemester] = useState('general');
  const [installEvent, setInstallEvent] = useState(null);
  const [message, setMessage] = useState('');
  const { offlineReady: [ready], needRefresh: [update], updateServiceWorker } = useRegisterSW({
    onRegisterError: () => setMessage('Offline app installation failed. Reconnect and reload to retry.'),
  });
  useEffect(() => {
    function imageFallback(event) {
      const image = event.target;
      if (image instanceof HTMLImageElement && !image.dataset.offlineFallback) {
        image.dataset.offlineFallback = 'true';
        image.src = `${import.meta.env.BASE_URL}image-unavailable.svg`;
        if (!image.alt) image.alt = 'Image unavailable. Connect to load it.';
      }
    }
    document.addEventListener('error', imageFallback, true);
    return () => document.removeEventListener('error', imageFallback, true);
  }, []);
  useEffect(() => {
    function capture(event) { event.preventDefault(); setInstallEvent(event); }
    window.addEventListener('beforeinstallprompt', capture);
    return () => window.removeEventListener('beforeinstallprompt', capture);
  }, []);
  const sources = Object.values(state.sources);
  const pending = state.pending > 0 || sources.some(source => source.pending);
  const cached = sources.some(source => source.cached);
  const emptyCache = sources.some(source => source.cached && source.empty);
  const failed = state.writeError || sources.find(source => source.error)?.error;
  const label = !state.online ? 'Offline' : pending ? 'Waiting to sync' : failed ? 'Could not sync' : cached ? 'Viewing saved data' : 'Online';
  const scope = `${pathname}:${semester}`;
  return <>
    {!state.online && <div role="status" className="fixed top-16 right-3 z-40 max-w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-bg-surface p-3 text-xs shadow-card lg:top-auto lg:bottom-16">
      Offline — only previously saved records are available. Changes save automatically as local drafts.
    </div>}
    <button type="button" onClick={() => setOpen(true)} className="fixed bottom-24 right-3 z-40 rounded-full border border-border bg-bg-surface px-3 py-2 text-xs shadow-card lg:bottom-4" aria-label={`${label}. Connection is detected automatically. Open connection details`}>
      <span aria-hidden="true" className={`inline-block mr-2 h-2 w-2 rounded-full ${!state.online || failed ? 'bg-amber-500' : 'bg-indigo-500'}`} />{label}{update ? ' · Update ready' : ''}
    </button>
    <Modal open={open} onClose={() => setOpen(false)} title="Connection status" maxWidth="max-w-lg">
      <div className="space-y-4 text-sm">
        <p role="status">{label}. Connection is detected automatically. {ready ? 'App files are saved for offline opening.' : 'Load this app online first so its files can be saved.'}</p>
        <p className="text-text-secondary">Only records already fetched by this browser are available offline. Saved results may be incomplete. A network connection does not guarantee that Firebase or other services are reachable.</p>
        {emptyCache && <p className="rounded-xl bg-amber-500/10 p-3">Some pages have no saved records. Connect and open them to load their data.</p>}
        {failed && <p role="alert" className="text-red-500">{failed}</p>}
        {pending && <p role="status">A save is waiting for server confirmation. Keep this session open and do not submit it again. Reconnect to finish syncing.</p>}
        {state.lastSynced && <p>Last confirmed save: {new Date(state.lastSynced).toLocaleString()}</p>}
        <p>{isTrustedDevice() ? 'Trusted device: saved records and drafts can survive closing the browser.' : 'Shared device: records are in memory; drafts are limited to this tab’s session.'}</p>
        {installEvent && <button className="underline" onClick={async () => { await installEvent.prompt(); setInstallEvent(null); }}>Install app</button>}
        {update && <button disabled={pending} className="rounded-xl bg-accent text-white p-3 disabled:opacity-50" onClick={() => {
          if (hasPendingWork()) return;
          if (confirm('Drafts save automatically. Finish editing in other tabs before updating. Reload now?')) void updateServiceWorker(true);
        }}>Update and reload</button>}
        {user && <>
          <label className="block">Draft semester or term<input className="block mt-1 w-full rounded-xl bg-bg-muted p-2" value={semester} onChange={e => setSemester(e.target.value)} placeholder="e.g. 2026-2027 semester 1" /></label>
          <Notes key={`${user.uid}:${scope}`} scope={scope} />
        </>}
        {(firebaseUser || savedAccountUid()) && <button className="underline text-red-500" onClick={async () => { try { await logout(); } catch (error) { setMessage(error.message); } }}>Sign out and clear saved account data</button>}
        {message && <p role="alert">{message}</p>}
      </div>
    </Modal>
  </>;
}
