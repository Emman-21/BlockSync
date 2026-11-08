import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Gauge,
} from "lucide-react";
import { collection, onSnapshot, query, where } from "../../services/trackedFirestore";
import clsx from "clsx";
import { NAV_ITEMS } from "../../utils/constants";
import { useUIStore } from "../../store/useUIStore";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../config/firebase";
import { useBranding } from "../../store/brandingStore";

export default function Sidebar() {
  const { BRANDING } = useBranding();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { isAdmin } = useAuth();
  const blockName = BRANDING.section;
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    if (!isAdmin) {
      setPendingRequests(0);
      return undefined;
    }

    const pendingQuery = query(
      collection(db, "adminRequests"),
      where("status", "==", "pending")
    );

    return onSnapshot(
      pendingQuery,
      (snapshot) => setPendingRequests(snapshot.size),
      (error) => {
        console.error("Unable to load pending admin requests:", error);
        setPendingRequests(0);
      }
    );
  }, [isAdmin]);

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 76 : 248 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-border bg-bg-surface lg:flex"
    >
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4">
        <img
          src="/icons/drumpyy-512.png"
          alt="Drumpyy"
          width={40}
          height={40}
          draggable={false}
          className="h-10 w-10 shrink-0 rounded-xl object-cover"
        />

        {!sidebarCollapsed && (
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold leading-tight text-text-primary">
              {BRANDING.name}
            </p>
            <p className="truncate text-xs text-text-secondary">{blockName}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {!sidebarCollapsed && (
          <div className="px-1 pb-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
              Navigation
            </p>
          </div>
        )}

        {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            title={sidebarCollapsed ? label : undefined}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-xl border-l-2 px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-transparent text-text-secondary hover:bg-bg-muted hover:text-text-primary"
              )
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {!sidebarCollapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            {!sidebarCollapsed && (
              <>
                <div className="mx-3 my-4 border-t border-border" />
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
                  Administration
                </p>
              </>
            )}
            <NavLink
              to="/admin-requests"
              title={sidebarCollapsed ? "Admin Requests" : undefined}
              className={({ isActive }) =>
                clsx(
                  "relative flex items-center gap-3 rounded-xl border-l-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-transparent text-text-secondary hover:bg-bg-muted hover:text-text-primary"
                )
              }
            >
              <ShieldCheck className="h-[18px] w-[18px] shrink-0" />
              {!sidebarCollapsed && (
                <span className="min-w-0 flex-1 truncate">Admin Requests</span>
              )}
              {pendingRequests > 0 && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={clsx(
                    "flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white",
                    sidebarCollapsed && "absolute right-1 top-1"
                  )}
                  aria-label={`${pendingRequests} pending admin requests`}
                >
                  {pendingRequests > 99 ? "99+" : pendingRequests}
                </motion.span>
              )}
            </NavLink>
            <NavLink
              to="/credits-info"
              title={sidebarCollapsed ? "Credits Info" : undefined}
              className={({ isActive }) =>
                clsx(
                  "relative flex items-center gap-3 rounded-xl border-l-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-transparent text-text-secondary hover:bg-bg-muted hover:text-text-primary"
                )
              }
            >
              <Gauge className="h-[18px] w-[18px] shrink-0" />
              {!sidebarCollapsed && (
                <span className="min-w-0 flex-1 truncate">Credits Info</span>
              )}
            </NavLink>
          </>
        )}
      </nav>

      <button
        type="button"
        onClick={toggleSidebar}
        className="flex h-12 shrink-0 items-center gap-2 border-t border-border px-4 text-sm text-text-secondary transition-colors hover:bg-bg-muted hover:text-text-primary"
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
        {!sidebarCollapsed && "Collapse"}
      </button>
    </motion.aside>
  );
}
