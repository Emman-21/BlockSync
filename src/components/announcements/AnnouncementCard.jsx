import { Pin, Pencil, Trash2, Paperclip } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";

export default function AnnouncementCard({ announcement, isAdmin, onEdit, onDelete, onTogglePin }) {
  const posted = announcement.datePosted?.toDate ? announcement.datePosted.toDate() : announcement.datePosted;

  return (
    <Card
      className={announcement.pinned ? "border-accent/40 bg-accent-soft" : ""}
      hoverable
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {announcement.pinned && <Pin className="w-3.5 h-3.5 text-accent shrink-0" fill="currentColor" />}
          <h3 className="font-semibold text-sm truncate">{announcement.title}</h3>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onTogglePin(announcement.id, !announcement.pinned)}
              className="p-1.5 rounded-lg hover:bg-bg-muted text-text-secondary"
              title={announcement.pinned ? "Unpin" : "Pin"}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onEdit(announcement)} className="p-1.5 rounded-lg hover:bg-bg-muted text-text-secondary">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(announcement.id)} className="p-1.5 rounded-lg hover:bg-bg-muted text-status-danger">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <p className="text-sm text-text-secondary mt-2 line-clamp-3">{announcement.description}</p>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="font-medium text-text-primary">{announcement.authorName}</span>
          <span>·</span>
          <span>{posted ? new Date(posted).toLocaleDateString() : ""}</span>
        </div>
        {announcement.attachments?.length > 0 && (
          <Badge tone="neutral">
            <Paperclip className="w-3 h-3" /> {announcement.attachments.length}
          </Badge>
        )}
      </div>
    </Card>
  );
}
