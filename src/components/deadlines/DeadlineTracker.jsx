import DeadlineCard from "./DeadlineCard";
import EmptyState from "../ui/EmptyState";
import { Inbox } from "lucide-react";
import { DEADLINE_STATUS } from "../../utils/constants";

const COLUMNS = [
  { key: DEADLINE_STATUS.UPCOMING, label: "Upcoming", tone: "text-status-info" },
  { key: DEADLINE_STATUS.COMPLETED, label: "Completed", tone: "text-status-success" },
];

export default function DeadlineTracker({ deadlines, isAdmin, onEdit, onDelete, onStatusChange }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {COLUMNS.map((col) => {
        const items = deadlines.filter((d) => d.status === col.key);
        return (
          <div key={col.key} className="bg-bg-muted/50 rounded-2xl p-3 min-h-[200px]">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className={`text-xs font-semibold uppercase tracking-wide ${col.tone}`}>{col.label}</span>
              <span className="text-xs bg-bg-surface border border-border rounded-full px-2 py-0.5 text-text-secondary">
                {items.length}
              </span>
            </div>

            {items.length === 0 ? (
              <div className="py-6">
                <EmptyState icon={Inbox} title="Nothing here" description="" />
              </div>
            ) : (
              <div className="space-y-2.5">
                {items.map((d) => (
                  <div key={d.id}>
                    <DeadlineCard deadline={d} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} />
                    {isAdmin && (
                      <select
                        value={d.status}
                        onChange={(e) => onStatusChange(d.id, e.target.value)}
                        className="mt-1.5 w-full text-xs bg-transparent text-text-secondary px-1 py-1 rounded-lg hover:bg-bg-surface focus:outline-none"
                      >
                        {COLUMNS.map((c) => (
                          <option key={c.key} value={c.key}>
                            Move to {c.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
