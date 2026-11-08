import clsx from "clsx";
import useContentLoadState from "../../hooks/useContentLoadState";
import "./skeleton.css";

export function Skeleton({ className, rounded = "rounded-lg", as: Shape = "div" }) {
  return <Shape aria-hidden="true" className={clsx("skeleton-shape", rounded, className)} />;
}

export function LoadingContent({ loading, hasData = false, error, label = "Content", skeleton, errorFallback, onRetry, children }) {
  const state = useContentLoadState({ loading, hasData, error });
  const errorNotice = errorFallback !== undefined ? errorFallback : <div role="alert" className="rounded-xl border border-status-danger/30 bg-status-danger/10 p-4 text-sm">
    <p className="font-medium text-status-danger">Unable to {hasData ? "refresh" : "load"} {label.toLowerCase()}</p>
    <p className="mt-1 text-text-secondary">{typeof error === "string" ? error : "Check your connection and try again."}</p>
    {onRetry && <button type="button" onClick={onRetry} className="mt-2 text-accent underline">Retry</button>}
  </div>;
  if (state === "error") {
    return errorNotice;
  }
  return <div className="min-w-0" data-content-state={state} aria-busy={state === "loading" || state === "refreshing"}>
    {state === "loading" ? <div role="status" aria-label={`Loading ${label.toLowerCase()}`}>
      <span className="sr-only">Loading {label.toLowerCase()}…</span>
      <div aria-hidden="true">{skeleton || <CardSkeletonGrid />}</div>
    </div> : <>{state === "stale" && errorNotice}{children}</>}
  </div>;
}

export function SkeletonLines({ count = 3 }) {
  return <div className="space-y-2">{Array.from({ length: count }, (_, index) =>
    <Skeleton key={index} className={clsx("h-3", index === count - 1 ? "w-2/3" : "w-full")} />)}</div>;
}

/** Use the same grid breakpoints, padding and image ratios as the real cards. */
export function CardSkeleton({ kind = "card" }) {
  if (kind === "course") return <div className="flex items-start gap-3 rounded-xl border border-border p-3"><Skeleton className="mt-1 h-4 w-4 shrink-0" /><div className="flex-1"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-24" /></div></div>;
  if (kind === "semester") return <div className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 flex-1"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-20" /></div><Skeleton className="h-11 w-36" /></div>;
  if (kind === "student") return <div className="flex items-center gap-3 rounded-card border border-border bg-bg-surface p-5">
    <Skeleton rounded="rounded-full" className="h-10 w-10 shrink-0" />
    <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton rounded="rounded-full" className="h-3 w-16" /></div>
  </div>;
  if (kind === "gallery") return <div className="overflow-hidden rounded-2xl bg-bg-surface shadow-card">
    <Skeleton rounded="rounded-none" className="aspect-video w-full" /><div className="px-4 py-3"><Skeleton className="h-4 w-20" /></div>
  </div>;
  if (kind === "photo") return <Skeleton rounded="rounded-xl" className="aspect-square w-full" />;
  if (kind === "organization") return <div className="flex overflow-hidden rounded-2xl border-2 border-transparent bg-bg-surface shadow-card">
    <Skeleton rounded="rounded-none" className="w-24 shrink-0 sm:w-28 md:w-32" />
    <div className="min-w-0 flex-1 space-y-3 p-5"><Skeleton className="h-5 w-3/4" /><SkeletonLines /><Skeleton rounded="rounded-full" className="h-5 w-20" /></div>
  </div>;
  if (kind === "registration") return <div className="overflow-hidden rounded-2xl bg-bg-surface shadow-card">
    <Skeleton rounded="rounded-none" className="h-48 w-full" /><div className="space-y-2 p-5"><Skeleton className="h-5 w-2/3" /><SkeletonLines count={2} /><Skeleton className="h-5 w-24" /></div>
  </div>;
  if (kind === "event") return <div className="space-y-3 rounded-xl border border-border bg-bg-surface p-4 sm:p-6">
    <div className="flex items-center gap-3"><Skeleton className="h-9 w-9" /><Skeleton className="h-6 w-2/3" /></div>
    <Skeleton className="h-4 w-48 max-w-full" /><SkeletonLines count={2} /><Skeleton rounded="rounded-full" className="h-6 w-24" />
  </div>;
  if (kind === "announcement") return <div className="space-y-3 rounded-2xl border border-border bg-bg-surface p-4 sm:p-5">
    <div className="flex items-center gap-3"><Skeleton rounded="rounded-full" className="h-9 w-9 shrink-0" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div></div>
    <Skeleton className="h-5 w-3/4" /><SkeletonLines count={4} /><div className="flex gap-3 border-t border-border pt-3"><Skeleton rounded="rounded-full" className="h-6 w-20" /><Skeleton rounded="rounded-full" className="h-6 w-20" /></div>
  </div>;
  if (kind === "deadline") return <div className="space-y-3 rounded-2xl border border-border bg-bg-surface p-4">
    <div className="flex items-center justify-between gap-3"><Skeleton className="h-5 w-2/3" /><Skeleton rounded="rounded-full" className="h-5 w-20" /></div>
    <Skeleton className="h-3 w-32" /><Skeleton className="h-4 w-48 max-w-full" /><Skeleton rounded="rounded-full" className="h-6 w-24" />
  </div>;
  return (
    <div className={clsx("bg-bg-surface border border-border space-y-3", kind === "subject" ? "rounded-xl p-4" : "rounded-card p-5")}>
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <div className="flex gap-2 pt-1">
        <Skeleton rounded="rounded-full" className="h-5 w-16" />
        <Skeleton rounded="rounded-full" className="h-5 w-16" />
      </div>
    </div>
  );
}

export function CardSkeletonGrid({ count = 6, kind = "card", className }) {
  return (
    <div className={className || "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} kind={kind} />
      ))}
    </div>
  );
}

export function ContentSkeleton({ kind = "card", count = 6 }) {
  const layouts = {
    student: "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
    subject: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
    announcement: "grid grid-cols-1 items-stretch gap-4 md:grid-cols-2",
    event: "space-y-4", deadline: "space-y-3", classroom: "space-y-3",
    organization: "grid grid-cols-1 gap-6 md:grid-cols-2",
    registration: "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3",
    gallery: "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3",
    photo: "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4",
  };
  if (kind === "feature") return <div className="overflow-hidden rounded-2xl bg-bg-muted"><Skeleton rounded="rounded-none" className="h-48 w-full" /><div className="space-y-3 p-5"><Skeleton className="h-6 w-2/3" /><SkeletonLines count={3} /><Skeleton className="h-4 w-24" /></div></div>;
  if (kind === "announcement-preview") return <div className="flex min-w-0 gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">{Array.from({ length: count }, (_, index) => <div key={index} className="min-w-0 shrink-0 basis-[90%] space-y-3 rounded-2xl border border-border bg-bg-muted p-4 md:basis-auto"><Skeleton rounded="rounded-full" className="h-5 w-20" /><Skeleton className="h-5 w-3/4" /><SkeletonLines count={3} /><Skeleton className="h-3 w-24" /></div>)}</div>;
  if (kind === "rows") return <div className="space-y-2">{Array.from({ length: count }, (_, index) =>
    <div key={index} className="flex items-center gap-3 rounded-xl bg-bg-muted p-3"><Skeleton className="h-10 w-10 shrink-0" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>)}</div>;
  return <CardSkeletonGrid kind={kind === "classroom" ? "deadline" : kind} count={count} className={layouts[kind]} />;
}

export function ScheduleSkeleton({ days = [], rows = 12, exams = false }) {
  if (exams) return <div className="space-y-4"><Skeleton className="h-20 w-full" /><CardSkeletonGrid kind="deadline" count={4} className="grid grid-cols-1 gap-3 lg:grid-cols-2" /></div>;
  return <>
    <div className="space-y-3 md:hidden">{days.map(day => <section key={day} className="rounded-xl border border-border bg-bg-surface p-3"><p className="mb-2 text-sm font-semibold">{day}</p><ContentSkeleton kind="rows" count={1} /></section>)}</div>
    <div className="hidden overflow-x-auto md:block"><table className="w-full table-fixed border-collapse text-sm"><thead><tr><th className="w-24 border-b border-border p-2 text-left text-xs">Time</th>{days.map(day => <th key={day} className="border-b border-border py-2 text-center text-xs">{day.slice(0, 3)}</th>)}</tr></thead>
      <tbody>{Array.from({ length: rows }, (_, index) => <tr key={index} className="h-9">{Array.from({ length: days.length + 1 }, (_, column) => <td key={column} className="h-9 border-t border-border/60 p-1"><Skeleton className={clsx("h-5", column ? "w-full" : "ml-auto w-16")} /></td>)}</tr>)}</tbody>
    </table></div>
  </>;
}

export function DetailSkeleton({ gallery = false }) {
  return <div className="space-y-5"><div className="flex items-center gap-3"><Skeleton className="h-11 w-11 shrink-0" /><div className="flex-1 space-y-2"><Skeleton className="h-7 w-2/3" /><Skeleton className="h-4 w-1/2" /></div></div>
    {gallery ? <ContentSkeleton kind="photo" count={8} /> : <><div className="rounded-card border border-border bg-bg-surface p-5"><Skeleton className="mb-4 h-8 w-2/3" /><SkeletonLines count={4} /></div><ContentSkeleton kind="deadline" count={3} /></>}
  </div>;
}
