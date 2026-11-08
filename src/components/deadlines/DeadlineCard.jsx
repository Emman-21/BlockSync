// src/components/deadlines/DeadlineCard.jsx
import { motion } from "framer-motion";
import { Trash2, Pencil } from "lucide-react";
import Badge from "../ui/Badge";
import { countdownLabel } from "../../utils/dateHelpers";
import { PRIORITY } from "../../utils/constants";
import {
  DEADLINE_TYPES,
  getDeadlineTypeLabel,
  getDeadlineTypeTone,
  isSpecialDeadlineType,
} from "../../utils/deadlineTypes";

const PRIORITY_TONE = {
  [PRIORITY.HIGH]: "danger",
  [PRIORITY.MEDIUM]: "warning",
  [PRIORITY.LOW]: "success",
};

export default function DeadlineCard({ deadline, isAdmin, onEdit, onDelete }) {
  const late = deadline.status === "late";
  const hasSpecialType = isSpecialDeadlineType(deadline.type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-bg-surface border border-border rounded-xl p-3.5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-150 group"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{deadline.title}</p>
        {isAdmin && (
          <div className="hidden group-hover:flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit(deadline)}
              className="p-1 rounded-md hover:bg-bg-muted text-text-secondary"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(deadline.id)}
              className="p-1 rounded-md hover:bg-bg-muted text-status-danger"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {deadline.subjectName && (
        <p className="text-xs text-text-secondary mt-1">{deadline.subjectName}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        {hasSpecialType && (
          <Badge tone={getDeadlineTypeTone(deadline.type)}>
            {getDeadlineTypeLabel(deadline.type)}
          </Badge>
        )}
        <Badge tone={PRIORITY_TONE[deadline.priority] ?? "neutral"}>
          {deadline.priority}
        </Badge>
        <Badge tone={late ? "danger" : "info"}>{countdownLabel(deadline.dueDate)}</Badge>
      </div>
    </motion.div>
  );
}