import clsx from "clsx";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "completed", label: "Completed" },
];

export default function DeadlineFilters({ active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={clsx(
            "text-xs font-medium px-3 py-1.5 rounded-full border transition-colors",
            active === f.key
              ? "bg-accent text-white border-accent"
              : "bg-bg-surface text-text-secondary border-border hover:bg-bg-muted"
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
