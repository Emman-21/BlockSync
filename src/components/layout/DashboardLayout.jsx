import { motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileDrawer from "./MobileDrawer";
import MobileTabBar from "./MobileTabBar";
import DrumpyyAssistant from "../drumpyy/DrumpyyAssistant";
import { useBranding } from "../../store/brandingStore";

export default function DashboardLayout({ children }) {
  const { APP_TITLE, BRANDING } = useBranding();
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative flex min-h-dvh bg-bg-primary text-text-primary">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -bottom-48 left-1/4 h-96 w-96 rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      <Sidebar />
      <MobileDrawer />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar />

        <div className="flex min-w-0 flex-1">
          <motion.main
            key={location.pathname}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.18,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="min-w-0 flex-1"
          >
            <div
              className="mx-auto w-full max-w-[1600px] px-3.5 py-4 sm:px-5 sm:py-6 lg:px-7 lg:pb-8 xl:px-8"
              style={{
                paddingBottom:
                  "calc(5.75rem + max(env(safe-area-inset-bottom), 0px))",
              }}
            >
              {children}
              <footer className="mb-10 mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-border pt-4 text-center text-xs text-text-secondary lg:mb-0">
                <span>{APP_TITLE}</span>
                <span>{BRANDING.tagline}</span>
              </footer>
            </div>
          </motion.main>
        </div>
      </div>

      <MobileTabBar />
      <DrumpyyAssistant />
    </div>
  );
}
