import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Gauge, ShieldCheck, X } from "lucide-react";
import { collection, onSnapshot, query, where } from "../../services/trackedFirestore";
import clsx from "clsx";
import { NAV_ITEMS } from "../../utils/constants";
import { useUIStore } from "../../store/useUIStore";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../config/firebase";
import { useBranding } from "../../store/brandingStore";

export default function MobileDrawer() {
  const { BRANDING } = useBranding();
  const { mobileDrawerOpen, closeMobileDrawer } = useUIStore();
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

  useEffect(() => {
    if (!mobileDrawerOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeMobileDrawer();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMobileDrawer, mobileDrawerOpen]);

  return (
    <AnimatePresence>
      {mobileDrawerOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close navigation menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobileDrawer}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          />

          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="fixed left-0 top-0 z-50 flex h-dvh w-[min(86vw,22rem)] flex-col overflow-hidden border-r border-border bg-bg-surface shadow-2xl lg:hidden"
            aria-label="Mobile navigation"
          >
            <div className="flex min-h-16 shrink-0 items-center justify-between border-b border-border px-4 pb-2 pt-[max(env(safe-area-inset-top),0.5rem)]">
              <div className="flex min-w-0 items-center gap-2">
                <img
                  src="/icons/drumpyy-512.png"
                  alt="Drumpyy"
                  width={40}
                  height={40}
                  draggable={false}
                  className="h-10 w-10 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-semibold leading-tight text-text-primary">
                    {BRANDING.name}
                  </p>
                  <p className="truncate text-xs text-text-secondary">{blockName}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeMobileDrawer}
                className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-muted hover:text-text-primary"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-4 pb-2 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
                Navigation
              </p>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 pb-5">
              {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  onClick={closeMobileDrawer}
                  className={({ isActive }) =>
                    clsx(
                      "flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.99]",
                      isActive
                        ? "bg-accent-soft text-accent"
                        : "text-text-secondary hover:bg-bg-muted hover:text-text-primary"
                    )
                  }
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="truncate">{label}</span>
                </NavLink>
              ))}

              {isAdmin && (
                <>
                  <div className="mx-3 my-4 border-t border-border" />
                  <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
                    Administration
                  </p>
                  <NavLink
                    to="/admin-requests"
                    onClick={closeMobileDrawer}
                    className={({ isActive }) =>
                      clsx(
                        "flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.99]",
                        isActive
                          ? "bg-accent-soft text-accent"
                          : "text-text-secondary hover:bg-bg-muted hover:text-text-primary"
                      )
                    }
                  >
                    <ShieldCheck className="h-[18px] w-[18px] shrink-0" />
                    <span className="min-w-0 flex-1 truncate">
                      Admin Requests
                    </span>
                    {pendingRequests > 0 && (
                      <motion.span
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white"
                        aria-label={`${pendingRequests} pending admin requests`}
                      >
                        {pendingRequests > 99 ? "99+" : pendingRequests}
                      </motion.span>
                    )}
                  </NavLink>
                  <NavLink
                    to="/credits-info"
                    onClick={closeMobileDrawer}
                    className={({ isActive }) =>
                      clsx(
                        "flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.99]",
                        isActive
                          ? "bg-accent-soft text-accent"
                          : "text-text-secondary hover:bg-bg-muted hover:text-text-primary"
                      )
                    }
                  >
                    <Gauge className="h-[18px] w-[18px] shrink-0" />
                    <span className="min-w-0 flex-1 truncate">Credits Info</span>
                  </NavLink>
                </>
              )}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
