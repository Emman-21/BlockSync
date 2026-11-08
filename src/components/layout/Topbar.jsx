import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useDeadlinesStore } from "../../store/useDeadlinesStore";
import { useStudentsStore } from "../../store/useStudentsStore";
import { useSubjectsStore } from "../../store/useSubjectsStore";
import { useAnnouncementsStore } from "../../store/useAnnouncementsStore";
import { useEventsStore } from "../../store/useEventsStore";
import { useOrganizationsStore } from "../../store/useOrganizationsStore";
import { useScheduleStore } from "../../store/useScheduleStore";
import { useGalleryStore } from "../../store/useGalleryStore";
import { useUIStore } from "../../store/useUIStore";
import { useBranding } from "../../store/brandingStore";
import { useClassroomContentsStore } from "../../store/useClassroomContentsStore";
import { buildClassroomDeadlines } from "../../utils/classroomDeadlines";

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  if (typeof value?.seconds === "number") return new Date(value.seconds * 1000);

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfDay = (date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const getDeadlineStatus = (dueDate) => {
  const today = startOfDay(new Date());
  const due = startOfDay(dueDate);
  const difference = Math.round((due - today) / 86400000);

  if (difference < 0) {
    const days = Math.abs(difference);
    return {
      label: `${days} day${days === 1 ? "" : "s"} overdue`,
      urgent: true,
    };
  }

  if (difference === 0) return { label: "Due today", urgent: true };
  if (difference === 1) return { label: "Due tomorrow", urgent: true };
  return { label: `Due in ${difference} days`, urgent: false };
};

const normalizeSearchText = (value) =>
  String(value || "").trim().toLowerCase();

const includesSearchQuery = (query, ...values) =>
  values.some((value) =>
    normalizeSearchText(value).includes(query)
  );

export default function Topbar() {
  const { BRANDING } = useBranding();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { openMobileDrawer } = useUIStore();
  const { deadlines, load: loadDeadlines } = useDeadlinesStore();
  const { students, load: loadStudents } = useStudentsStore();
  const { subjects, load: loadSubjects } = useSubjectsStore();
  const { announcements, load: loadAnnouncements } = useAnnouncementsStore();
  const { events, load: loadEvents } = useEventsStore();
  const { organizations, load: loadOrganizations } = useOrganizationsStore();
  const { schedules, load: loadSchedules } = useScheduleStore();
  const { albums, load: loadAlbums } = useGalleryStore();
  const { contents: classroomContents, load: loadClassroomContents } = useClassroomContentsStore();

  useEffect(() => {
    // Classroom content uses one shared subscription, also consumed by the pages.
    loadClassroomContents();
  }, [loadClassroomContents]);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const profileRef = useRef(null);
  const alertsRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  const displayName = user?.name || "Student";
  const initial = displayName.charAt(0).toUpperCase();
  const blockName = BRANDING.section;

  useEffect(() => {
    const subscriptions = [
      loadDeadlines(),
      loadStudents(),
      loadSubjects(),
      loadAnnouncements(),
      loadEvents(),
      loadOrganizations(),
      loadSchedules(),
      loadAlbums(),
    ];

    return () => {
      subscriptions.forEach((unsubscribe) => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      });
    };
  }, [
    loadAlbums,
    loadAnnouncements,
    loadDeadlines,
    loadEvents,
    loadOrganizations,
    loadSchedules,
    loadStudents,
    loadSubjects,
  ]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (alertsRef.current && !alertsRef.current.contains(event.target)) {
        setAlertsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
        setActiveSearchIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const urgentDeadlines = useMemo(() => {
    const today = startOfDay(new Date());
    const alertLimit = new Date(today);
    alertLimit.setDate(alertLimit.getDate() + 3);

    const examDeadlines = schedules
      .filter((schedule) => schedule.scheduleKind === "exam" && schedule.examDate)
      .map((schedule) => ({
        id: `exam-schedule-${schedule.id}`,
        sourceScheduleId: schedule.id,
        isExamSchedule: true,
        examType: schedule.examType || "Prelims",
        subjectName: schedule.subjectName,
        title: `${schedule.examType || "Prelims"} Examination`,
        dueDate: `${schedule.examDate}T${schedule.startTime || "00:00"}:00`,
      }));

    const classroomDeadlines = buildClassroomDeadlines(classroomContents, subjects);

    return [...deadlines, ...examDeadlines, ...classroomDeadlines]
      .filter((deadline) => {
        const dueDate = toDate(deadline.dueDate);
        const isCompleted =
          deadline.completed === true ||
          deadline.isCompleted === true ||
          deadline.status?.toLowerCase() === "completed";

        const dueDay = dueDate ? startOfDay(dueDate) : null;

        return (
          dueDay &&
          !isCompleted &&
          dueDay >= today &&
          dueDay <= alertLimit
        );
      })
      .sort((a, b) => toDate(a.dueDate) - toDate(b.dueDate));
  }, [deadlines, schedules, classroomContents, subjects]);

  const searchResults = useMemo(() => {
    const query = normalizeSearchText(searchQuery);

    if (!query) return [];

    const results = [];

    students.forEach((student) => {
      if (includesSearchQuery(query, student.name)) {
        results.push({
          key: `student-${student.id}`,
          category: "Student",
          title: student.name,
          subtitle: student.gender
            ? `${student.gender.charAt(0).toUpperCase()}${student.gender.slice(1)} student`
            : "Registered student",
          path: "/students",
        });
      }
    });

    subjects.forEach((subject) => {
      if (
        includesSearchQuery(
          query,
          subject.name,
          subject.instructor,
          subject.googleClassroomCode
        )
      ) {
        results.push({
          key: `subject-${subject.id}`,
          category: "Subject",
          title: subject.name,
          subtitle: subject.instructor || "Subject details",
          path: `/subjects/${subject.id}`,
        });
      }
    });

    deadlines.forEach((deadline) => {
      if (
        includesSearchQuery(
          query,
          deadline.title,
          deadline.subjectName,
          deadline.description
        )
      ) {
        results.push({
          key: `deadline-${deadline.id}`,
          category: "Deadline",
          title: deadline.title || "Untitled deadline",
          subtitle: deadline.subjectName || "General",
          path: `/deadlines/${deadline.id}`,
        });
      }
    });

    announcements.forEach((announcement) => {
      if (
        includesSearchQuery(
          query,
          announcement.title,
          announcement.description,
          announcement.authorName
        )
      ) {
        results.push({
          key: `announcement-${announcement.id}`,
          category: "Announcement",
          title: announcement.title || "Untitled announcement",
          subtitle: announcement.authorName || "Announcement",
          path: "/announcements",
        });
      }
    });

    events.forEach((event) => {
      if (
        includesSearchQuery(
          query,
          event.title,
          event.description,
          event.location
        )
      ) {
        results.push({
          key: `event-${event.id}`,
          category: "Event",
          title: event.title || "Untitled event",
          subtitle: event.location || "Event details",
          path: "/events",
        });
      }
    });

    organizations.forEach((organization) => {
      if (
        includesSearchQuery(
          query,
          organization.name,
          organization.description
        )
      ) {
        results.push({
          key: `organization-${organization.id}`,
          category: "Organization",
          title: organization.name,
          subtitle: organization.description || "Organization details",
          path: "/organizations",
        });
      }
    });

    schedules.forEach((schedule) => {
      if (
        includesSearchQuery(
          query,
          schedule.subjectName,
          schedule.day,
          schedule.room,
          schedule.instructor,
          schedule.type
        )
      ) {
        results.push({
          key: `schedule-${schedule.id}`,
          category: "Schedule",
          title: schedule.subjectName || "Class schedule",
          subtitle: [schedule.day, schedule.room || schedule.type]
            .filter(Boolean)
            .join(" · "),
          path: "/schedule",
        });
      }
    });

    albums.forEach((album) => {
      if (
        includesSearchQuery(
          query,
          album.title,
          album.description
        )
      ) {
        results.push({
          key: `album-${album.id}`,
          category: "Gallery",
          title: album.title,
          subtitle: album.description || `${album.photos?.length || 0} photos`,
          path: `/gallery/${album.id}`,
        });
      }
    });

    return results.slice(0, 24);
  }, [
    albums,
    announcements,
    deadlines,
    events,
    organizations,
    schedules,
    searchQuery,
    students,
    subjects,
  ]);

  useEffect(() => {
    setActiveSearchIndex(-1);
  }, [searchQuery]);

  const closeSearch = () => {
    setSearchOpen(false);
    setActiveSearchIndex(-1);
  };

  const openSearchResult = (result) => {
    if (!result) return;

    setSearchQuery("");
    closeSearch();
    navigate(result.path);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Escape") {
      closeSearch();
      searchInputRef.current?.blur();
      return;
    }

    if (!searchOpen || searchResults.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSearchIndex((current) =>
        current >= searchResults.length - 1 ? 0 : current + 1
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSearchIndex((current) =>
        current <= 0 ? searchResults.length - 1 : current - 1
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      openSearchResult(
        searchResults[activeSearchIndex >= 0 ? activeSearchIndex : 0]
      );
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");

    try {
      await logout();
      setDropdownOpen(false);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      setLogoutError(error?.message || "Could not sign out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  const openDeadlines = () => {
    setAlertsOpen(false);
    navigate("/deadlines");
  };

  return (
    <header
      className="sticky top-0 z-20 border-b border-border/80 bg-bg-surface/90 backdrop-blur-xl"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-4 lg:px-6">
        <button
          type="button"
          onClick={openMobileDrawer}
          aria-label="Open navigation"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-bg-muted hover:text-text-primary lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 shrink-0 max-w-28 sm:max-w-40">
          <p className="truncate font-display text-base font-semibold leading-tight lg:text-lg">
            {BRANDING.name}
          </p>
          <p className="truncate text-xs text-text-secondary">{blockName}</p>
        </div>

        <div className="flex min-w-0 flex-1 justify-center">
          <div ref={searchRef} className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchOpen(true);
                setAlertsOpen(false);
                setDropdownOpen(false);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search"
              aria-label="Search the block system"
              aria-expanded={searchOpen && Boolean(searchQuery.trim())}
              aria-controls="global-search-results"
              autoComplete="off"
              className="h-10 w-full rounded-xl border border-transparent bg-bg-muted py-2 pl-9 pr-3 text-sm placeholder:text-text-secondary transition-colors focus:border-accent/30 focus:bg-bg-surface focus:outline-none focus-visible:outline-2 focus-visible:outline-accent sm:placeholder:text-transparent md:placeholder:text-text-secondary"
            />

            <AnimatePresence>
              {searchOpen && searchQuery.trim() && (
                <motion.div
                  id="global-search-results"
                  initial={{ opacity: 0, y: -6, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.99 }}
                  transition={{ duration: 0.15 }}
                  className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4rem)] z-40 overflow-hidden rounded-2xl border border-border bg-bg-surface shadow-card-hover sm:absolute sm:inset-x-auto sm:left-0 sm:right-0 sm:top-auto sm:mt-2"
                >
                  <div className="border-b border-border px-3 py-2 text-xs text-text-secondary">
                    {searchResults.length > 0
                      ? `${searchResults.length} matching result${searchResults.length === 1 ? "" : "s"}`
                      : "No matching results"}
                  </div>

                  <div className="max-h-[min(28rem,65dvh)] overflow-y-auto p-1.5">
                    {searchResults.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <Search className="mx-auto h-8 w-8 text-text-secondary/50" />
                        <p className="mt-2 text-sm font-medium text-text-primary">
                          Nothing found
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                          Try a student, subject, deadline, event, or organization name.
                        </p>
                      </div>
                    ) : (
                      searchResults.map((result, index) => (
                        <button
                          key={result.key}
                          type="button"
                          onMouseEnter={() => setActiveSearchIndex(index)}
                          onClick={() => openSearchResult(result)}
                          className={`flex min-h-12 w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                            activeSearchIndex === index
                              ? "bg-accent-soft"
                              : "hover:bg-bg-muted"
                          }`}
                        >
                          <span
                            data-compact-control="true"
                            className="mt-0.5 shrink-0 rounded-md bg-bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent"
                          >
                            {result.category}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-text-primary">
                              {result.title}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-text-secondary">
                              {result.subtitle}
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-bg-muted hover:text-text-primary sm:flex"
        >
          {theme === "dark" ? (
            <Sun className="h-[18px] w-[18px]" />
          ) : (
            <Moon className="h-[18px] w-[18px]" />
          )}
        </button>

        <div ref={alertsRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setAlertsOpen((current) => !current);
              setDropdownOpen(false);
            }}
            aria-label={`${urgentDeadlines.length} urgent deadline alerts`}
            aria-expanded={alertsOpen}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-bg-muted hover:text-text-primary"
          >
            <Bell className="h-[18px] w-[18px]" />
            {urgentDeadlines.length > 0 && (
              <span
                data-compact-control="true"
                className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-status-danger px-1 text-[10px] font-bold leading-none text-white ring-2 ring-bg-surface"
              >
                {urgentDeadlines.length > 9 ? "9+" : urgentDeadlines.length}
              </span>
            )}
          </button>

          <AnimatePresence>
            {alertsOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4rem)] z-30 overflow-hidden rounded-2xl border border-border bg-bg-surface shadow-card-hover sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96"
              >
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <p className="font-semibold text-text-primary">Urgent alerts</p>
                    <p className="text-xs text-text-secondary">
                      Due within the next 3 days
                    </p>
                  </div>
                  <span
                    data-compact-control="true"
                    className="rounded-full bg-status-danger/10 px-2.5 py-1 text-xs font-semibold text-status-danger"
                  >
                    {urgentDeadlines.length}
                  </span>
                </div>

                <div className="max-h-[min(25rem,65dvh)] overflow-y-auto p-2">
                  {urgentDeadlines.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <CalendarClock className="mx-auto h-9 w-9 text-text-secondary/60" />
                      <p className="mt-3 text-sm font-medium text-text-primary">
                        You’re all caught up
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        No unfinished deadlines are due within the next 3 days.
                      </p>
                    </div>
                  ) : (
                    urgentDeadlines.map((deadline) => {
                      const dueDate = toDate(deadline.dueDate);
                      const status = getDeadlineStatus(dueDate);

                      return (
                        <button
                          key={deadline.id}
                          type="button"
                          onClick={openDeadlines}
                          className="flex min-h-12 w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-bg-muted"
                        >
                          <span
                            className={`mt-0.5 rounded-lg p-2 ${
                              status.urgent
                                ? "bg-status-danger/10 text-status-danger"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-text-primary">
                              {deadline.title || "Untitled deadline"}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-text-secondary">
                              {deadline.subjectName || "General"}
                            </span>
                            <span
                              className={`mt-1.5 block text-xs font-semibold ${
                                status.urgent
                                  ? "text-status-danger"
                                  : "text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {status.label} ·{" "}
                              {dueDate.toLocaleDateString("en-PH", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                <button
                  type="button"
                  onClick={openDeadlines}
                  className="min-h-12 w-full border-t border-border px-4 py-3 text-sm font-semibold text-accent transition-colors hover:bg-bg-muted"
                >
                  View all deadlines
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setDropdownOpen((current) => !current);
              setAlertsOpen(false);
            }}
            aria-label="Open account menu"
            aria-expanded={dropdownOpen}
            className="flex h-10 items-center gap-1 rounded-xl transition-all hover:bg-bg-muted hover:ring-2 hover:ring-accent/20"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
              {initial}
            </span>
            <ChevronDown className="mr-1 hidden h-4 w-4 text-text-secondary sm:block" />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="fixed right-3 top-[calc(env(safe-area-inset-top)+4rem)] z-30 w-56 overflow-hidden rounded-2xl border border-border bg-bg-surface py-1 shadow-card-hover sm:absolute sm:right-0 sm:top-auto sm:mt-2"
              >
                <div className="border-b border-border px-4 py-3">
                  <p className="truncate text-sm font-semibold">{displayName}</p>
                  <p className="mt-0.5 truncate text-xs capitalize text-text-secondary">
                    {user?.role || "User"} · {blockName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex min-h-12 w-full items-center gap-2 px-4 py-2.5 text-sm text-status-danger transition-colors hover:bg-bg-muted disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
                {logoutError && <p role="alert" className="px-4 pb-3 text-xs text-status-danger">{logoutError}</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
