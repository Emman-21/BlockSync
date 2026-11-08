import { LoadingContent, ContentSkeleton } from "../ui/Skeleton";
import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "../../context/AuthContext";
import {
  addComment,
  deleteComment,
  subscribeComments,
} from "../../services/commentService";

const MAX_COMMENT_LENGTH = 500;

export default function Comments({ announcementId }) {
  const { user, firebaseUser, isAdmin } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");
  const inputRef = useRef(null);

  const actorId = String(firebaseUser?.uid || "").trim();
  const authorName = String(user?.name || "Student").trim();

  useEffect(() => {
    setLoading(true);
    setCommentError("");

    const unsubscribe = subscribeComments(
      announcementId,
      (data) => {
        setComments(data);
        setLoading(false);
      },
      (error) => {
        setCommentError(error?.message || "Unable to load comments.");
        setLoading(false);
      }
    );

    return () => unsubscribe?.();
  }, [announcementId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const content = newComment.trim();

    if (!content || !user || !actorId || submitting) return;

    setSubmitting(true);
    setCommentError("");

    try {
      await addComment({
        announcementId,
        actorId,
        authorName,
        content,
      });
      setNewComment("");
      inputRef.current?.focus();
    } catch (error) {
      setCommentError(error?.message || "Unable to add your comment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (comment) => {
    const ownsComment = comment.actorId === actorId;

    if (
      (!isAdmin && !ownsComment) ||
      !window.confirm("Delete this comment?")
    ) {
      return;
    }

    setCommentError("");
    try {
      await deleteComment(comment.id);
    } catch (error) {
      setCommentError(error?.message || "Unable to delete the comment.");
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "Sending...";
    try {
      const date = timestamp.toDate
        ? timestamp.toDate()
        : new Date(timestamp);
      return format(date, "MMM d, h:mm a");
    } catch {
      return "";
    }
  };

  return (
    <div className="mt-3 border-t border-border/70 pt-3">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="text-xs text-text-secondary transition hover:text-text-primary"
      >
        {isOpen ? "Hide comments" : `Show comments (${comments.length})`}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-2">
          <LoadingContent key={announcementId} loading={loading} hasData={comments.length > 0} error={commentError} errorFallback={null} label="Comments" skeleton={<ContentSkeleton kind="rows" count={2} />}>{comments.length === 0 ? (
            <p className="text-xs text-text-secondary">No comments yet.</p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto overscroll-contain pr-1">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-xl bg-bg-muted p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium text-text-primary">
                          {comment.authorName}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {formatTime(comment.timestamp)}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words text-text-primary">
                        {comment.content}
                      </p>
                    </div>

                    {(isAdmin || comment.actorId === actorId) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(comment)}
                        className="shrink-0 text-xs text-status-danger transition hover:opacity-70"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}</LoadingContent>

          {user && actorId && (
            <form onSubmit={handleSubmit} className="flex items-end gap-2 pt-1">
              <div className="min-w-0 flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={newComment}
                  onChange={(event) => setNewComment(event.target.value)}
                  placeholder="Write a comment..."
                  maxLength={MAX_COMMENT_LENGTH}
                  disabled={submitting}
                  className="w-full rounded-xl bg-bg-muted px-3 py-2.5 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
                />
                {newComment.length > 450 && (
                  <p className="mt-1 text-right text-[11px] text-text-secondary">
                    {newComment.length}/{MAX_COMMENT_LENGTH}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Post comment"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          )}

          {commentError && (
            <p className="text-xs text-status-danger">{commentError}</p>
          )}
        </div>
      )}
    </div>
  );
}
