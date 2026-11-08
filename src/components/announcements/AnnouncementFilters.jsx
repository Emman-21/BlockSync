import { Search } from "lucide-react";
import clsx from "clsx";

export default function AnnouncementFilters({ search, onSearch, pinnedOnly, onTogglePinnedOnly }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search announcements..."
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
        />
      </div>
      <button
        onClick={() => onTogglePinnedOnly(!pinnedOnly)}
        className={clsx(
          "text-xs font-medium px-3 py-2 rounded-xl border transition-colors shrink-0",
          pinnedOnly
            ? "bg-accent text-white border-accent"
            : "bg-bg-surface text-text-secondary border-border hover:bg-bg-muted"
        )}
      >
        Pinned only
      </button>
    </div>
  );
}
