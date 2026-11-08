// src/components/ui/Badge.jsx
import clsx from "clsx";

const TONES = {
  accent: "bg-accent-soft text-accent",
  success: "bg-status-success/10 text-status-success",
  warning: "bg-status-warning/10 text-status-warning",
  danger: "bg-status-danger/10 text-status-danger",
  info: "bg-status-info/10 text-status-info",
  neutral: "bg-bg-muted text-text-secondary",
  laboratory: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  quiz: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  "final-project": "bg-pink-500/10 text-pink-600 dark:text-pink-400",
};

export default function Badge({ tone = "neutral", children, className }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}