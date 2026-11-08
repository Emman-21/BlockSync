import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";

const ToastContext = createContext(null);

const toastStyles = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    accentClass: "bg-emerald-500",
  },
  error: {
    icon: AlertCircle,
    iconClass: "text-rose-600 dark:text-rose-400",
    accentClass: "bg-rose-500",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-600 dark:text-amber-400",
    accentClass: "bg-amber-500",
  },
  info: {
    icon: Info,
    iconClass: "text-sky-600 dark:text-sky-400",
    accentClass: "bg-sky-500",
  },
};

function ToastItem({ toast, onDismiss }) {
  const style = toastStyles[toast.type] || toastStyles.info;
  const Icon = style.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.97 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="pointer-events-auto relative w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-xl shadow-slate-900/10 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/95 dark:shadow-black/30"
      role={toast.type === "error" ? "alert" : "status"}
      aria-live={toast.type === "error" ? "assertive" : "polite"}
    >
      <span
        className={`absolute inset-y-0 left-0 w-1 ${style.accentClass}`}
        aria-hidden="true"
      />

      <div className="flex items-start gap-3 pl-1">
        <Icon
          className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconClass}`}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          {toast.title && (
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {toast.title}
            </p>
          )}
          <p
            className={`${
              toast.title ? "mt-0.5" : ""
            } text-sm leading-5 text-slate-600 dark:text-slate-300`}
          >
            {toast.message}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismissToast = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    },
    []
  );

  const showToast = useCallback(
    ({ type = "info", title = "", message, duration = 3500 }) => {
      if (!message) return null;

      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const nextToast = { id, type, title, message };

      setToasts((current) => [...current.slice(-3), nextToast]);

      if (duration > 0) {
        const timer = window.setTimeout(() => dismissToast(id), duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismissToast]
  );

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
      success: (message, title = "Success") =>
        showToast({ type: "success", title, message }),
      error: (message, title = "Something went wrong") =>
        showToast({ type: "error", title, message, duration: 5000 }),
      warning: (message, title = "Please check") =>
        showToast({ type: "warning", title, message, duration: 4500 }),
      info: (message, title = "Information") =>
        showToast({ type: "info", title, message }),
    }),
    [dismissToast, showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-end gap-3 sm:left-auto sm:right-5 sm:w-full sm:max-w-sm"
        aria-label="Notifications"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={dismissToast}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }

  return context;
}
