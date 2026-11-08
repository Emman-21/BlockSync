import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { MOBILE_TAB_ITEMS } from "../../utils/constants";
import { useUIStore } from "../../store/useUIStore";
import AssistantDrumpyyMascot from "../drumpyy/AssistantDrumpyyMascot";

export default function MobileTabBar() {
  const drumpyyOpen = useUIStore((state) => state.drumpyyOpen);
  const toggleDrumpyy = useUIStore((state) => state.toggleDrumpyy);
  const celebrationId = useUIStore((state) => state.drumpyyCelebrationId);
  const pose = useUIStore((state) => state.drumpyyPose);

  const renderTab = ({ label, path, icon: Icon }) => (
    <NavLink
      key={path}
      to={path}
      aria-label={label}
      className={({ isActive }) =>
        clsx(
          "group flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-semibold leading-none transition-all duration-200 active:scale-[0.97]",
          isActive
            ? "text-accent"
            : "text-text-secondary hover:bg-bg-muted hover:text-text-primary"
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={clsx(
              "flex h-8 min-w-10 items-center justify-center rounded-xl px-2 transition-all duration-200",
              isActive
                ? "bg-accent-soft shadow-sm"
                : "bg-transparent group-hover:bg-bg-muted"
            )}
          >
            <Icon
              className={clsx(
                "h-5 w-5 transition-transform duration-200",
                isActive && "scale-105"
              )}
            />
          </span>
          <span className="max-w-full truncate">{label}</span>
        </>
      )}
    </NavLink>
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-bg-surface/95 px-2 pt-1 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 6px)" }}
      aria-label="Primary mobile navigation"
    >
      <div className="mx-auto grid h-[82px] max-w-lg grid-cols-5 gap-1">
        {MOBILE_TAB_ITEMS.slice(0, 2).map(renderTab)}

        <button
          type="button"
          onClick={toggleDrumpyy}
          aria-label={`${drumpyyOpen ? "Close" : "Open"} Drumpyy AI assistant`}
          aria-expanded={drumpyyOpen}
          className={clsx(
            "group relative flex min-w-0 flex-col items-center justify-end rounded-2xl px-1 pb-0.5 text-[10px] font-semibold leading-none transition-all duration-200 active:scale-[0.97]",
            drumpyyOpen
              ? "text-accent"
              : "text-text-secondary hover:bg-bg-muted hover:text-text-primary"
          )}
        >
          <span
            className="absolute left-1/2 top-[-2rem] z-10 flex h-24 w-24 -translate-x-1/2 items-center justify-center"
          >
            <AssistantDrumpyyMascot
              key={celebrationId}
              pose={pose}
              className="h-20 w-20"
            />
          </span>
          <span className="relative z-20 max-w-full truncate">Drumpyy</span>
        </button>

        {MOBILE_TAB_ITEMS.slice(2).map(renderTab)}
      </div>
    </nav>
  );
}
