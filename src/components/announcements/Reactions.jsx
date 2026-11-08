import { Skeleton } from "../ui/Skeleton";
import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  clearReaction,
  deleteReaction,
  saveReaction,
  subscribeReactions,
} from '../../services/reactionService';

const REACTION_TYPES = [
  { type: '👍', label: 'Like' },
  { type: '❤️', label: 'Love' },
  { type: '😂', label: 'Laugh' },
  { type: '😮', label: 'Wow' },
  { type: '😢', label: 'Sad' },
  { type: '😡', label: 'Angry' },
];

const ACTIVE_REACTION_TYPES = new Set(
  REACTION_TYPES.map((reaction) => reaction.type)
);

function clsx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Reactions({ announcementId }) {
  const { user, isAdmin } = useAuth();
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reactionError, setReactionError] = useState('');

  const actorId = String(
    user?.uid || ''
  ).trim();
  const authorName = String(user?.name || 'Student').trim();

  useEffect(() => {
    setLoading(true);
    setReactionError('');

    const unsubscribe = subscribeReactions(
      announcementId,
      (data) => {
        setReactions(data);
        setLoading(false);
      },
      (error) => {
        setReactionError(
          error?.message || 'Unable to load reactions.'
        );
        setLoading(false);
      }
    );

    return () => unsubscribe?.();
  }, [announcementId]);

  const userReaction = useMemo(() => {
    const actorReaction = reactions.find(
      (reaction) =>
        reaction.actorId === actorId &&
        ACTIVE_REACTION_TYPES.has(reaction.type)
    );

    if (actorReaction) return actorReaction;

    return reactions.find(
      (reaction) =>
        !reaction.actorId &&
        reaction.authorName === authorName &&
        ACTIVE_REACTION_TYPES.has(reaction.type)
    );
  }, [actorId, authorName, reactions]);

  const visibleReactions = useMemo(
    () =>
      reactions.filter((reaction) =>
        ACTIVE_REACTION_TYPES.has(reaction.type)
      ),
    [reactions]
  );

  const reactionCounts = useMemo(() => {
    const counts = {};

    REACTION_TYPES.forEach(({ type }) => {
      counts[type] = visibleReactions.filter(
        (reaction) => reaction.type === type
      ).length;
    });

    return counts;
  }, [visibleReactions]);

  const handleReaction = async (type) => {
    if (!user || !actorId || submitting) return;

    setSubmitting(true);
    setReactionError('');

    try {
      if (userReaction && !userReaction.actorId && isAdmin) {
        await deleteReaction(userReaction.id);
      }

      if (userReaction?.type === type) {
        await clearReaction({
          announcementId,
          actorId,
          authorName,
        });
      } else {
        await saveReaction({
          announcementId,
          actorId,
          authorName,
          type,
        });
      }
    } catch (error) {
      setReactionError(
        error?.message || 'Unable to save your reaction.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && reactions.length === 0 && !reactionError) return <div role="status" aria-label="Loading reactions" className="flex flex-wrap gap-2"><span className="sr-only">Loading reactions…</span>{REACTION_TYPES.map(item => <Skeleton key={item.type} rounded="rounded-full" className="h-11 w-12" />)}</div>;

  return (
    <div className="mt-3 border-t border-border/70 pt-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {REACTION_TYPES.map((reaction) => {
          const count = reactionCounts[reaction.type] || 0;
          const selected = userReaction?.type === reaction.type;
          const reactionNames = visibleReactions
            .filter((entry) => entry.type === reaction.type)
            .map((entry) => ({
              id: entry.id,
              name: String(entry.authorName || '').trim() || 'Student',
            }));
          const tooltipId = `reaction-names-${encodeURIComponent(announcementId)}-${reaction.type.codePointAt(0)}`;

          return (
            <div key={reaction.type} className="group relative inline-flex">
              <button
                type="button"
                onClick={() => handleReaction(reaction.type)}
                disabled={!user || !actorId || submitting}
                className={clsx(
                  'inline-flex min-h-9 items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition disabled:cursor-not-allowed disabled:opacity-50',
                  selected
                    ? 'border-accent/40 bg-accent/20 text-accent'
                    : 'border-transparent bg-bg-muted text-text-secondary hover:border-accent/20 hover:bg-accent-soft'
                )}
                aria-pressed={selected}
                aria-label={`${reaction.label}: ${count}`}
                aria-describedby={isAdmin && count > 0 ? tooltipId : undefined}
              >
                <span>{reaction.type}</span>
                {count > 0 && <span>{count}</span>}
              </button>

              {isAdmin && count > 0 && (
                <div
                  id={tooltipId}
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-56 max-w-[calc(100vw-2rem)] rounded-lg bg-bg-primary px-3 py-2 text-left text-xs text-text-primary shadow-lg ring-1 ring-border group-hover:block group-focus-within:block"
                >
                  <p className="mb-1 font-medium">
                    {reaction.label} by:
                  </p>
                  <ul className="max-h-40 space-y-0.5 overflow-y-auto">
                    {reactionNames.map((entry) => (
                      <li key={entry.id}>{entry.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}

        {submitting && (
          <Loader2 className="ml-1 h-4 w-4 animate-spin text-accent" />
        )}

        {visibleReactions.length > 0 && (
          <span className="ml-1 text-xs text-text-secondary">
            {visibleReactions.length}{' '}
            {visibleReactions.length === 1 ? 'reaction' : 'reactions'}
          </span>
        )}
      </div>

      {reactionError && (
        <p className="mt-2 text-xs text-status-danger">
          {reactionError}
        </p>
      )}
    </div>
  );
}
