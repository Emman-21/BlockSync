import { useEffect, useState } from 'react';

const MAX_TIMEOUT = 2_147_483_647;

export default function useDeadlineClock(deadlines) {
  const [now, setNow] = useState(() => new Date());

  const nextDueTime = deadlines.reduce((soonest, deadline) => {
    if (!deadline?.dueDate || deadline.noFixedDeadline) return soonest;

    const dueTime = new Date(deadline.dueDate).getTime();
    if (!Number.isFinite(dueTime) || dueTime <= now.getTime()) return soonest;

    return Math.min(soonest, dueTime);
  }, Infinity);

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timeout = Number.isFinite(nextDueTime)
      ? setTimeout(
          refresh,
          Math.min(MAX_TIMEOUT, Math.max(0, nextDueTime - Date.now()))
        )
      : null;

    document.addEventListener('visibilitychange', refresh);

    return () => {
      if (timeout !== null) clearTimeout(timeout);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [nextDueTime, now]);

  return now;
}
