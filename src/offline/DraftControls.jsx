import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { readDraft, saveDraft } from './device';
export default function DraftControls({ scope, value, onRestore }) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [loadedKey, setLoadedKey] = useState('');
  const restoreRef = useRef(onRestore);
  const draftId = user?.uid ? `${user.uid}:${scope}` : '';
  useEffect(() => { restoreRef.current = onRestore; }, [onRestore]);
  useEffect(() => {
    setLoadedKey('');
    setMessage('');
    if (!user?.uid) return;
    const saved = readDraft(user.uid, scope);
    if (saved) {
      restoreRef.current(saved.value);
      setMessage('Previous draft restored.');
    }
    setLoadedKey(draftId);
  }, [draftId, scope, user?.uid]);
  useLayoutEffect(() => {
    if (!user?.uid || loadedKey !== draftId) return;
    try {
      saveDraft(user.uid, scope, value);
      setMessage('Draft saved automatically.');
    } catch (error) {
      setMessage(error.message || 'Draft could not be saved.');
    }
  }, [draftId, loadedKey, scope, user?.uid, value]);
  if (!user?.uid) return null;
  return <section className="rounded-xl bg-accent-soft p-3 text-sm space-y-2">
    <p>Drafts save automatically while you edit and restore when you reopen this form. They are local only and never published.</p>
    {message && <p role="status">{message}</p>}
  </section>;
}
