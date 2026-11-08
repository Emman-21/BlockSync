import { motion } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import { CalendarClock } from "lucide-react";
import { relativeDayLabel, formatTime } from "../../utils/dateHelpers";

export default function ActivityTimeline({ items = [], title = "Upcoming Activities" }) {
  if (items.length === 0) {
    return (
      <Card hoverable={false}>
        <EmptyState
          icon={CalendarClock}
          title="Nothing on the horizon"
          description="Deadlines and events will show up here as soon as they're added."
        />
      </Card>
    );
  }

  const sorted = [...items].sort((a, b) => a.date - b.date);
  const groups = [];
  for (const item of sorted) {
    const label = relativeDayLabel(item.date);
    let group = groups.find((g) => g.label === label);
    if (!group) {
      group = { label, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }

  return (
    <Card hoverable={false} className="p-0 overflow-hidden">
      <div className="px-5 pt-5 pb-2">
        <h3 className="font-display font-semibold text-base">{title}</h3>
      </div>
      <div className="px-5 pb-5">
        {groups.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? "mt-5" : "mt-2"}>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-2">
              {group.label}
            </p>
            <ul className="relative border-l border-border pl-4 space-y-3">
              {group.items.map((item, i) => {
                const dotColor = item.color || "#6366F1";
                return (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="relative"
                  >
                    <span
                      className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: dotColor }}
                    />
                    <div className="flex items-start gap-2">
                      {item.done ? (
                        <CheckCircle2 className="w-4 h-4 text-status-success mt-0.5 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: dotColor }} />
                      )}
                      <div>
                        {/* Subject / event label */}
                        {item.subjectName && (
                          <span
                            className="text-xs font-medium"
                            style={{ color: dotColor }}
                          >
                            {item.subjectName}
                          </span>
                        )}
                        <p
                          className={
                            "text-sm font-medium " +
                            (item.done ? "line-through text-text-secondary" : "text-text-primary")
                          }
                        >
                          {item.title}
                        </p>
                        <p className="text-xs text-text-secondary">{formatTime(item.date)}</p>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}