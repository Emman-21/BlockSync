import clsx from "clsx";

export default function Card({ children, className, hoverable = true, ...props }) {
  return (
    <div
      className={clsx(
        "bg-bg-surface border border-border rounded-card shadow-card p-5 transition-all duration-150",
        hoverable && "hover:shadow-card-hover hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
