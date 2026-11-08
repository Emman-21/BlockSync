import { Skeleton } from "../ui/Skeleton";
import useContentLoadState from "../../hooks/useContentLoadState";
import Card from "../ui/TiltCard";
import clsx from "clsx";

const TONES = {
  accent: "bg-accent-soft text-accent",
  success: "bg-status-success/10 text-status-success",
  warning: "bg-status-warning/10 text-status-warning",
  info: "bg-status-info/10 text-status-info",
};

export default function StatCard({ 
  icon: Icon, 
  label, 
  value,
  loading,
  hasData = false,
  error, 
  tone = "accent",
  onClick,
  variant = "default"
}) {
  const contentState = useContentLoadState({ loading, hasData, error });
  const handleClick = (e) => {
    if (onClick) onClick(e);
  };

  return (
    <Card 
      className={clsx(
        variant === "hero"
          ? "grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 !p-3 sm:grid-cols-[2.75rem_minmax(0,1fr)]"
          : "flex items-center gap-4",
        variant === "hero" && "border-white/20 bg-white/10 text-white shadow-none backdrop-blur-sm hover:bg-white/20",
        onClick && "cursor-pointer hover:shadow-card-hover transition-shadow"
      )}
      onClick={handleClick}
    >
      <div className={clsx(
        "rounded-xl flex items-center justify-center shrink-0",
        variant === "hero" ? "h-8 w-8 sm:h-11 sm:w-11" : "h-11 w-11",
        variant === "hero" ? "bg-white/15 text-white" : TONES[tone]
      )}>
        <Icon className="w-5 h-5" />
      </div>
      <div className={clsx("min-w-0", variant === "hero" && "contents")}>
        <p className="text-2xl font-display font-semibold leading-tight">{contentState === "loading" ? <><Skeleton as="span" className="inline-block h-6 w-10 align-middle" /><span className="sr-only">Loading {label}</span></> : contentState === "error" ? <span title={`Unable to load ${label}`}>—</span> : value}</p>
        <p className={clsx(
          "text-xs",
          variant === "hero"
            ? "col-span-2 min-h-[2.5em] whitespace-normal break-normal leading-tight text-white/85"
            : "truncate text-text-secondary"
        )}>
          {label}
        </p>
      </div>
    </Card>
  );
}