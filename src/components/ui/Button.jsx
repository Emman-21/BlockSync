import clsx from "clsx";

const VARIANTS = {
  primary: "bg-accent text-white hover:bg-accent-hover shadow-sm",
  outline: "border border-border text-text-primary hover:bg-bg-muted",
  ghost: "text-text-secondary hover:bg-bg-muted hover:text-text-primary",
  danger: "bg-status-danger text-white hover:opacity-90",
};

const SIZES = {
  sm: "text-xs px-3 py-1.5 gap-1.5",
  md: "text-sm px-4 py-2 gap-2",
  lg: "text-base px-5 py-2.5 gap-2",
  icon: "p-2",
};

export default function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-150",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
