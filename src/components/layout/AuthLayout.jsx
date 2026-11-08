import { motion, useReducedMotion } from "framer-motion";
import { Moon, Sparkles, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useBranding } from "../../store/brandingStore";
import LoginDrumpyyMascot from "../drumpyy/LoginDrumpyyMascot";

export default function AuthLayout({ children }) {
  const { BRANDING, APP_TITLE } = useBranding();
  const { theme, toggleTheme } = useTheme();
  const systemReducedMotion = useReducedMotion();
  const reduceMotion = systemReducedMotion;
  const blockName = BRANDING.section;

  return (
    <div className="relative h-dvh min-h-dvh touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain bg-gradient-to-br from-accent-soft via-bg-primary to-bg-primary [-webkit-overflow-scrolling:touch] lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,1.08fr)_minmax(430px,0.92fr)] lg:overflow-hidden">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className="fixed right-5 top-5 z-50 rounded-xl border border-border/70 bg-bg-surface/80 p-2.5 text-text-secondary shadow-sm backdrop-blur-md transition hover:bg-bg-muted hover:text-text-primary"
      >
        {theme === "dark" ? (
          <Sun className="h-[18px] w-[18px]" />
        ) : (
          <Moon className="h-[18px] w-[18px]" />
        )}
      </button>

      <section className="relative hidden overflow-hidden border-r border-white/10 bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-900 px-10 py-12 text-white lg:flex lg:h-dvh lg:flex-col lg:justify-center xl:px-16 2xl:px-24">
        <motion.div
          aria-hidden="true"
          className="absolute -left-24 -top-28 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl"
          animate={reduceMotion ? undefined : { x: [0, 36, 0], y: [0, 22, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-fuchsia-400/25 blur-3xl"
          animate={reduceMotion ? undefined : { x: [0, -30, 0], y: [0, -28, 0] }}
          transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 max-w-2xl">
          <div className="mb-6 flex w-fit flex-col items-center">
            <LoginDrumpyyMascot className="mb-3 h-36 w-36" />
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-violet-50 backdrop-blur-md"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              {BRANDING.tagline}
            </motion.div>
          </div>

          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.2 }}
            className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-violet-200"
          >
            Welcome to
          </motion.p>

          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.2, ease: "easeOut" }}
            className="font-display text-5xl font-bold leading-[1.05] tracking-tight xl:text-6xl 2xl:text-7xl"
          >
            <span className="block text-white">{BRANDING.name}</span>
            <span className="mt-3 block bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-300 bg-clip-text text-2xl text-transparent xl:text-3xl 2xl:text-4xl">
              {blockName}
            </span>
          </motion.h1>
        </div>

        <div className="absolute bottom-8 left-10 z-10 flex items-center gap-3 text-xs text-violet-200 xl:left-16 2xl:left-24">
          <span className="h-px w-10 bg-violet-300/60" />
          {APP_TITLE}
        </div>
      </section>

      <main className="flex min-h-dvh items-start justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 lg:h-dvh lg:min-h-0 lg:items-start lg:overflow-y-auto lg:overscroll-contain lg:px-8 lg:py-8 xl:px-12">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="my-auto w-full max-w-sm lg:max-w-lg"
        >
          <div className="mb-3 flex flex-col items-center lg:hidden">
            <LoginDrumpyyMascot className="mb-2 h-20 w-20" />
            <h1 className="font-display text-lg font-semibold">{BRANDING.name}</h1>
            <p className="text-xs text-text-secondary">{blockName}</p>
            <p className="mt-1 text-xs text-text-secondary">{BRANDING.tagline}</p>
          </div>

          <div className="rounded-card border border-border bg-bg-surface p-3 pb-2 shadow-card lg:rounded-[28px] lg:bg-bg-surface/95 lg:p-8 lg:shadow-2xl lg:backdrop-blur-xl">
            {children}
          </div>

          <p className="mt-4 hidden text-center text-xs text-text-secondary lg:block">
            Secure access for students and authorized administrators
          </p>
        </motion.div>
      </main>
    </div>
  );
}
