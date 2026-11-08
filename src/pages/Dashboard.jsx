import ContentImage from "../components/ui/ContentImage";
import { LoadingContent, ContentSkeleton, Skeleton } from "../components/ui/Skeleton";
import useContentLoadState from "../hooks/useContentLoadState";
import { onlineFetch } from '../offline/onlineFetch';
import { useBranding } from "../store/brandingStore";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Users,
  ListChecks,
  PartyPopper,
  Megaphone,
  CalendarDays,
  Cake,
  Quote,
  Building2,
  Images,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock3,
  ArrowRight,
  AlertTriangle,
  History,
  Pencil,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  differenceInDays,
  eachDayOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfYear,
  endOfWeek,
  format,
  isPast,
  isToday,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';

import StatCard from '../components/dashboard/StatCard';
import ActivityTimeline from '../components/dashboard/ActivityTimeline';
import Card from '../components/ui/Card';
import RichTextContent from '../components/ui/RichTextContent';
import { useAuth } from '../context/AuthContext';

import { useStudentsStore } from '../store/useStudentsStore';
import { useDeadlinesStore } from '../store/useDeadlinesStore';
import { useEventsStore } from '../store/useEventsStore';
import { useAnnouncementsStore } from '../store/useAnnouncementsStore';
import { useScheduleStore } from '../store/useScheduleStore';
import { useSubjectsStore } from '../store/useSubjectsStore';
import { useOrganizationsStore } from '../store/useOrganizationsStore';
import { useGalleryStore } from '../store/useGalleryStore';
import { getOptimizedImageUrl } from '../services/imageUploadService';
import { subscribeFirebaseUsage } from '../services/firebaseUsageService';
import { useClassroomContentsStore } from '../store/useClassroomContentsStore';
import { buildClassroomDeadlines } from '../utils/classroomDeadlines';
import {
  DEADLINE_TYPES,
  DEADLINE_TYPE_OPTIONS,
} from '../utils/deadlineTypes';

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const COMPACT_MONTHS = {
  Jan: 'Ja',
  Feb: 'Fe',
  Mar: 'Mr',
  Apr: 'Ap',
  May: 'My',
  Jun: 'Jn',
  Jul: 'Jl',
  Aug: 'Au',
  Sep: 'Se',
  Oct: 'Oc',
  Nov: 'No',
  Dec: 'De',
};

const QUOTES = [
  'Small daily progress beats occasional bursts of effort.',
  'Success is the sum of small efforts, repeated day in and day out.',
  'The secret of getting ahead is getting started.',
  'Difficult roads often lead to beautiful destinations.',
  'Believe you can, and you are halfway there.',
  'Great things are done by a series of small things brought together.',
  'Your future is created by what you do today, not tomorrow.',
];

const getVisibleCarouselIndices = (itemCount, currentIndex) => {
  const visibleCount = Math.min(itemCount, 5);
  const firstIndex = Math.max(
    0,
    Math.min(currentIndex - Math.floor(visibleCount / 2), itemCount - visibleCount)
  );

  return Array.from({ length: visibleCount }, (_, offset) => firstIndex + offset);
};

const CREDIT_STORAGE_KEY = 'itnt3108-credit-usage';
const CREDIT_HISTORY_KEY = 'itnt3108-credit-history';
const CREDIT_SERVICES = [
  { id: 'make', name: 'Make.com', unit: 'credits', color: '#a855f7' },
  { id: 'cloudinary', name: 'Cloudinary', unit: 'credits', color: '#3b82f6' },
  { id: 'firebase', name: 'Firebase', unit: 'credits', color: '#f59e0b' },
];
const FIREBASE_DAILY_LIMITS = {
  reads: 50000,
  writes: 20000,
  deletes: 20000,
};
const CREDIT_WORKER_URL = String(
  import.meta.env.VITE_CREDIT_WORKER_URL ||
    'https://block-system-credit-monitor.24-05076.workers.dev'
).replace(/\/$/, '');
const CLASSROOM_SYNC_URL = String(
  import.meta.env.VITE_CLASSROOM_SYNC_URL ||
    `${CREDIT_WORKER_URL}/api/classroom-sync`
).trim();
const CREDIT_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const EXTERNAL_CREDIT_SERVICES = [
  { id: 'make', endpoint: '/api/make-usage' },
  { id: 'cloudinary', endpoint: '/api/cloudinary-usage' },
];

const readStoredJson = (key, fallback) => {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const getCreditStatus = (current, total) => {
  const safeCurrent = Number(current) || 0;
  const safeTotal = Number(total) || 0;
  if (safeTotal <= 0) return { label: 'No usage data', tone: 'text-status-danger', color: '#ef4444' };
  const percentage = (safeCurrent / safeTotal) * 100;
  if (safeCurrent <= 0) return { label: 'No credits remaining', tone: 'text-status-danger', color: '#ef4444' };
  if (percentage <= 20) return { label: 'Critical balance', tone: 'text-status-danger', color: '#ef4444' };
  if (percentage <= 35) return { label: 'Low balance', tone: 'text-status-warning', color: '#f59e0b' };
  return { label: 'Balance is healthy', tone: 'text-status-success', color: '#22c55e' };
};

const gradientToHex = {
  'from-purple-500 to-indigo-500': '#7c3aed',
  'from-pink-500 to-rose-500': '#ec4899',
  'from-blue-500 to-cyan-500': '#3b82f6',
  'from-green-500 to-emerald-500': '#22c55e',
  'from-red-500 to-orange-500': '#ef4444',
  'from-teal-500 to-cyan-500': '#14b8a6',
  'from-fuchsia-500 to-pink-500': '#d946ef',
  'from-sky-500 to-blue-500': '#0ea5e9',
  'from-lime-500 to-green-500': '#84cc16',
  'from-amber-500 to-yellow-500': '#f59e0b',
  'from-gray-400 to-gray-500': '#9ca3af',
  'bg-violet-500': '#8b5cf6',
  'bg-pink-500': '#ec4899',
  'bg-blue-500': '#3b82f6',
  'bg-emerald-500': '#10b981',
  'bg-red-500': '#ef4444',
  'bg-teal-500': '#14b8a6',
  'bg-fuchsia-500': '#d946ef',
  'bg-sky-500': '#0ea5e9',
  'bg-lime-500': '#84cc16',
  'bg-amber-500': '#f59e0b',
  'bg-slate-500': '#64748b',
};

const getTodayName = () => DAYS[new Date().getDay()];

const convertToDate = (dateValue) => {
  if (!dateValue) {
    return null;
  }

  if (typeof dateValue.toDate === 'function') {
    return dateValue.toDate();
  }

  const convertedDate = new Date(dateValue);

  if (Number.isNaN(convertedDate.getTime())) {
    return null;
  }

  return convertedDate;
};

const formatTime12 = (time24) => {
  if (!time24) {
    return '';
  }

  const [hour, minute] = time24.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;

  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
};

const stringToColor = (text = '') => {
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = text.charCodeAt(index) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;

  return `hsl(${hue}, 70%, 50%)`;
};

const getImageSource = (image) => {
  if (typeof image === 'string') {
    return image.trim();
  }

  return String(
    image?.url || image?.imageUrl || image?.secureUrl || ''
  ).trim();
};

const getOrganizationImage = (organization) =>
  String(
    organization?.imageUrl ||
      organization?.logoUrl ||
      organization?.logo ||
      organization?.image ||
      ''
  ).trim();

const getAlbumCover = (album) => {
  const savedCover = String(
    album?.coverImage ||
      album?.coverImageUrl ||
      album?.imageUrl ||
      album?.coverUrl ||
      ''
  ).trim();

  if (savedCover) {
    return savedCover;
  }

  const firstPhoto = Array.isArray(album?.photos)
    ? album.photos[0]
    : null;

  return getImageSource(firstPhoto);
};

export default function Dashboard() {
  const { BRANDING } = useBranding();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  const { students, load: loadStudents, loading: studentsLoading, firebaseError: studentsError } = useStudentsStore();
  const { deadlines, load: loadDeadlines, loading: deadlinesLoading, firebaseError: deadlinesError } = useDeadlinesStore();
  const { events, load: loadEvents, loading: eventsLoading, firebaseError: eventsError } = useEventsStore();
  const {
    announcements,
    loading: announcementsLoading,
    firebaseError: announcementsError,
    load: loadAnnouncements,
  } = useAnnouncementsStore();
  const { schedules, load: loadSchedules, loading: schedulesLoading, firebaseError: schedulesError } = useScheduleStore();
  const { subjects, load: loadSubjects, loading: subjectsLoading, firebaseError: subjectsError } = useSubjectsStore();
  const { contents: classroomContents, load: loadClassroomContents, loading: classroomLoading, error: classroomError, unsubscribe: classroomSubscription } = useClassroomContentsStore();
  const {
    organizations,
    loading: organizationsLoading,
    firebaseError: organizationsError,
    load: loadOrganizations,
  } = useOrganizationsStore();
  const {
    albums: galleryAlbums,
    loading: galleryLoading,
    firebaseError: galleryError,
    load: loadGalleryAlbums,
  } = useGalleryStore();

  const classroomPending = classroomLoading || (!classroomSubscription && !classroomError);
  const deadlinePending = deadlinesLoading || classroomPending || schedulesLoading || subjectsLoading;
  const deadlineError = deadlinesError || classroomError || schedulesError || subjectsError;
  const deadlineHasData = deadlines.length > 0 || classroomContents.length > 0 || schedules.some(item => item.scheduleKind === "exam");
  const deadlineState = useContentLoadState({ loading: deadlinePending, hasData: deadlineHasData, error: deadlineError });
  const statLoadStates = {
    "/students": { loading: studentsLoading, hasData: students.length > 0, error: studentsError },
    "/deadlines": { loading: deadlinePending, hasData: deadlineHasData, error: deadlineError },
    "/events": { loading: eventsLoading, hasData: events.length > 0, error: eventsError },
    "/announcements": { loading: announcementsLoading || classroomPending, hasData: announcements.length + classroomContents.length > 0, error: announcementsError || classroomError },
    "/schedule": { loading: schedulesLoading, hasData: schedules.length > 0, error: schedulesError },
  };

  const [organizationIndex, setOrganizationIndex] = useState(0);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isCompactChart, setIsCompactChart] = useState(false);
  const [deadlineChartRange, setDeadlineChartRange] = useState('month');
  const [creditUsage, setCreditUsage] = useState(() =>
    readStoredJson(
      CREDIT_STORAGE_KEY,
      CREDIT_SERVICES.map((service) => ({
        ...service,
        total: 0,
        current: 0,
        month: format(new Date(), 'MMMM yyyy'),
        resetDate: '',
        updatedAt: '',
      }))
    )
  );
  const [creditHistory, setCreditHistory] = useState(() =>
    readStoredJson(CREDIT_HISTORY_KEY, [])
  );
  const [creditEditor, setCreditEditor] = useState(null);
  const [creditHistoryOpen, setCreditHistoryOpen] = useState(false);
  const [firebaseUsageBreakdown, setFirebaseUsageBreakdown] = useState(null);
  const [creditSyncErrors, setCreditSyncErrors] = useState({});
  const [creditSyncing, setCreditSyncing] = useState({});
  const [classroomSyncStatus, setClassroomSyncStatus] = useState({
    syncing: false,
    message: '',
    error: '',
  });

  const syncExternalCredits = useCallback(async (serviceIds = ['make', 'cloudinary']) => {
      const services = EXTERNAL_CREDIT_SERVICES.filter((service) =>
        serviceIds.includes(service.id)
      );

      if (services.length === 0) return;

      setCreditSyncing((current) => {
        const next = { ...current };
        services.forEach((service) => {
          next[service.id] = true;
        });
        return next;
      });

      try {
        const results = await Promise.allSettled(
          services.map(async (service) => {
            const response = await onlineFetch(`${CREDIT_WORKER_URL}${service.endpoint}`, {
              headers: { Accept: 'application/json' },
              cache: 'no-store',
            });
            const data = await response.json();

            if (!response.ok || data.success !== true) {
              throw new Error(data.message || `Request failed (${response.status})`);
            }

            return { service, data };
          })
        );

        const successfulUpdates = new Map();
        const nextErrors = {};

        results.forEach((result, index) => {
          const service = services[index];

          if (result.status === 'rejected') {
            nextErrors[service.id] = result.reason?.message || 'Unable to synchronize';
            return;
          }

          const { data } = result.value;
          successfulUpdates.set(service.id, {
            total: Number(data.credits?.totalCredits) || 0,
            current: Number(data.credits?.remainingCredits) || 0,
            month: data.month || format(new Date(), 'MMMM yyyy'),
            monthValue: format(new Date(), 'yyyy-MM'),
            resetDate: data.reset?.nextReset
              ? String(data.reset.nextReset).slice(0, 10)
              : '',
            updatedAt: data.syncedAt || new Date().toISOString(),
            source: data.credits?.source || `${service.id}_usage_api`,
          });
        });

        setCreditSyncErrors((current) => {
          const next = { ...current };
          services.forEach((service) => {
            delete next[service.id];
          });
          return { ...next, ...nextErrors };
        });
        setCreditUsage((currentUsage) =>
          currentUsage.map((item) =>
            successfulUpdates.has(item.id)
              ? { ...item, ...successfulUpdates.get(item.id) }
              : item
          )
        );
      } finally {
        setCreditSyncing((current) => {
          const next = { ...current };
          services.forEach((service) => {
            next[service.id] = false;
          });
          return next;
        });
      }
    }, []);

  const syncGoogleClassroom = useCallback(async () => {
    if (!CLASSROOM_SYNC_URL || classroomSyncStatus.syncing) return;

    setClassroomSyncStatus({ syncing: true, message: '', error: '' });

    try {
      const response = await onlineFetch(CLASSROOM_SYNC_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'itnt3108-dashboard',
          requestedAt: new Date().toISOString(),
        }),
      });

      const responseText = await response.text();
      let data = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = { message: responseText };
        }
      }

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || `Google Classroom sync failed (${response.status})`
        );
      }

      setClassroomSyncStatus({
        syncing: false,
        message: data.message || 'Google Classroom sync started successfully.',
        error: '',
      });

      window.setTimeout(() => void syncExternalCredits(['make']), 1500);
    } catch (error) {
      setClassroomSyncStatus({
        syncing: false,
        message: '',
        error: error?.message || 'Unable to start Google Classroom sync.',
      });
    }
  }, [classroomSyncStatus.syncing, syncExternalCredits]);

  useEffect(() => {
    if (!isAdmin) return undefined;

    void syncExternalCredits();
    const timer = window.setInterval(
      () => void syncExternalCredits(),
      CREDIT_REFRESH_INTERVAL_MS
    );

    return () => {
      window.clearInterval(timer);
    };
  }, [isAdmin, syncExternalCredits]);

  useEffect(() => {
    if (!isAdmin) return undefined;

    return subscribeFirebaseUsage(
      (usage) => {
        const quotaPercentages = [
          (usage.reads / FIREBASE_DAILY_LIMITS.reads) * 100,
          (usage.writes / FIREBASE_DAILY_LIMITS.writes) * 100,
          (usage.deletes / FIREBASE_DAILY_LIMITS.deletes) * 100,
        ];
        const highestPercentageUsed = Math.min(
          100,
          Math.max(0, ...quotaPercentages)
        );
        const total = 100;

        setFirebaseUsageBreakdown(usage);
        setCreditUsage((currentUsage) => {
          const firebaseItem = {
            ...(currentUsage.find((item) => item.id === 'firebase') ||
              CREDIT_SERVICES.find((item) => item.id === 'firebase')),
            total,
            current: Math.max(0, 100 - highestPercentageUsed),
            month: 'Today (app-recorded estimate)',
            resetDate: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
            updatedAt: new Date().toISOString(),
            source: 'app_tracker',
          };

          return currentUsage.some((item) => item.id === 'firebase')
            ? currentUsage.map((item) =>
                item.id === 'firebase'
                  ? firebaseItem
                  : item
              )
            : [...currentUsage, firebaseItem];
        });
      },
      (error) => console.error('Unable to load Firebase usage counters:', error)
    );
  }, [isAdmin]);

  const saveCreditUsage = () => {
    if (!creditEditor) return;

    const previous = creditUsage.find((item) => item.id === creditEditor.id);
    const nextCurrent = Math.max(0, Number(creditEditor.current) || 0);
    const nextTotal = Math.max(0, Number(creditEditor.total) || 0);
    const timestamp = new Date().toISOString();
    const updatedService = {
      ...previous,
      ...creditEditor,
      current: nextCurrent,
      total: nextTotal,
      updatedAt: timestamp,
    };
    const nextUsage = creditUsage.map((item) =>
      item.id === creditEditor.id ? updatedService : item
    );

    setCreditUsage(nextUsage);
    window.localStorage.setItem(CREDIT_STORAGE_KEY, JSON.stringify(nextUsage));

    if (!previous || Number(previous.current) !== nextCurrent) {
      const historyItem = {
        id: `${creditEditor.id}-${Date.now()}`,
        service: creditEditor.name,
        previous: Number(previous?.current) || 0,
        current: nextCurrent,
        consumed: Math.max(0, (Number(previous?.current) || 0) - nextCurrent),
        reason: String(creditEditor.reason || '').trim() || 'Manual balance update',
        updatedAt: timestamp,
        updatedBy: user?.name || user?.email || 'Admin',
      };
      const nextHistory = [historyItem, ...creditHistory].slice(0, 100);
      setCreditHistory(nextHistory);
      window.localStorage.setItem(CREDIT_HISTORY_KEY, JSON.stringify(nextHistory));
    }

    setCreditEditor(null);
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 639px)');

    const updateChartLayout = () => {
      setIsCompactChart(mediaQuery.matches);
    };

    updateChartLayout();
    mediaQuery.addEventListener?.('change', updateChartLayout);

    return () => {
      mediaQuery.removeEventListener?.('change', updateChartLayout);
    };
  }, []);

  useEffect(() => {
    const unsubscribers = [
      loadStudents(),
      loadDeadlines(),
      loadEvents(),
      loadAnnouncements(),
      loadSchedules(),
      loadSubjects(),
      loadOrganizations(),
      loadGalleryAlbums(),
      loadClassroomContents(),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [
    loadStudents,
    loadDeadlines,
    loadEvents,
    loadAnnouncements,
    loadSchedules,
    loadSubjects,
    loadOrganizations,
    loadGalleryAlbums,
    loadClassroomContents,
  ]);

  useEffect(() => {
    if (organizationIndex >= organizations.length) {
      setOrganizationIndex(0);
    }
  }, [organizationIndex, organizations.length]);

  useEffect(() => {
    if (galleryIndex >= galleryAlbums.length) {
      setGalleryIndex(0);
    }
  }, [galleryAlbums.length, galleryIndex]);

  useEffect(() => {
    if (organizations.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setOrganizationIndex(
        (currentIndex) =>
          (currentIndex + 1) % organizations.length
      );
    }, 4000);

    return () => window.clearInterval(timer);
  }, [organizations.length]);

  useEffect(() => {
    if (galleryAlbums.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setGalleryIndex(
        (currentIndex) =>
          (currentIndex + 1) % galleryAlbums.length
      );
    }, 4500);

    return () => window.clearInterval(timer);
  }, [galleryAlbums.length]);

  const dashboardDeadlines = useMemo(() => [
    ...deadlines,
    ...buildClassroomDeadlines(classroomContents, subjects),
  ], [deadlines, classroomContents, subjects]);

  const examSchedules = useMemo(
    () =>
      schedules
        .filter(
          (schedule) =>
            schedule.scheduleKind === 'exam' && schedule.examDate
        )
        .map((schedule) => ({
          ...schedule,
          date: convertToDate(
            `${schedule.examDate}T${schedule.startTime || '00:00'}:00`
          ),
        }))
        .filter((schedule) => schedule.date),
    [schedules]
  );

  const upcomingDeadlines = useMemo(() => {
    return dashboardDeadlines
      .filter((deadline) => {
        const dueDate = convertToDate(deadline.dueDate);

        return dueDate && (!isPast(dueDate) || isToday(dueDate));
      })
      .sort((first, second) => {
        return (
          convertToDate(first.dueDate) -
          convertToDate(second.dueDate)
        );
      });
  }, [dashboardDeadlines]);

  const upcomingExamSchedules = useMemo(
    () =>
      examSchedules
        .filter(
          (schedule) =>
            !isPast(schedule.date) || isToday(schedule.date)
        )
        .sort((first, second) => first.date - second.date),
    [examSchedules]
  );

  // 🔽 Count upcoming deadlines per type
  const deadlineTypeCounts = useMemo(() => {
    const counts = {
      [DEADLINE_TYPES.REGULAR]: 0,
      [DEADLINE_TYPES.LABORATORY]: 0,
      [DEADLINE_TYPES.QUIZ]: 0,
      [DEADLINE_TYPES.FINAL_PROJECT]: 0,
    };

    upcomingDeadlines.forEach((deadline) => {
      const type = deadline.type || DEADLINE_TYPES.REGULAR;
      if (counts[type] !== undefined) {
        counts[type] += 1;
      }
    });

    return counts;
  }, [upcomingDeadlines]);

  const weeklyClassesCount = useMemo(() => {
    const now = new Date();

    return schedules.filter((schedule) => {
      if (schedule.scheduleKind !== 'exam') {
        return true;
      }

      if (!schedule.examDate) {
        return false;
      }

      const examEnd = convertToDate(
        `${schedule.examDate}T${schedule.endTime || schedule.startTime || '23:59'}:00`
      );

      return examEnd && examEnd >= now;
    }).length;
  }, [schedules]);

  const upcomingEvents = useMemo(() => {
    return events
      .filter((event) => {
        const eventDate = convertToDate(event.endDate || event.date);

        return eventDate && (!isPast(eventDate) || isToday(eventDate));
      })
      .sort((first, second) => {
        return (
          convertToDate(first.date) -
          convertToDate(second.date)
        );
      });
  }, [events]);

  const recentAnnouncements = useMemo(() => {
    return announcements
      .filter((announcement) => {
        const postedDate = convertToDate(
          announcement.datePosted ||
            announcement.createdAt ||
            announcement.date
        );

        if (!postedDate) {
          return false;
        }

        const expiryDate = convertToDate(announcement.expiryDate);
        const expired =
          expiryDate && isPast(expiryDate) && !isToday(expiryDate);

        return !expired;
      })
      .sort((first, second) => {
        const firstDate = convertToDate(
          first.datePosted || first.createdAt || first.date
        );

        const secondDate = convertToDate(
          second.datePosted || second.createdAt || second.date
        );

        return secondDate - firstDate;
      });
  }, [announcements]);

  const recentAnnouncementFeed = recentAnnouncements.slice(0, 3);
  const recentUpcomingEvents = useMemo(
    () =>
      [...upcomingEvents]
        .sort(
          (first, second) =>
            (convertToDate(second.createdAt)?.getTime() ?? 0) -
            (convertToDate(first.createdAt)?.getTime() ?? 0)
        )
        .slice(0, 3),
    [upcomingEvents]
  );

  const upcomingOrganizationDeadlines = useMemo(() => {
    return organizations
      .filter((organization) => {
        const deadline = convertToDate(organization.deadline);

        return deadline && (!isPast(deadline) || isToday(deadline));
      })
      .sort((first, second) =>
        convertToDate(first.deadline) -
        convertToDate(second.deadline)
      );
  }, [organizations]);

  const todaysClasses = useMemo(() => {
    const today = getTodayName();

    return schedules
      .filter((schedule) => schedule.scheduleKind !== 'exam' && schedule.day === today)
      .sort((first, second) =>
        (first.startTime || '').localeCompare(second.startTime || '')
      )
      .map((schedule) => {
        const subject = subjects.find(
          (item) => item.name === schedule.subjectName
        );

        const gradient =
          subject?.color || 'from-gray-400 to-gray-500';

        const colorHex =
          gradientToHex[gradient] ||
          stringToColor(schedule.subjectName || 'subject');

        return {
          courseName: schedule.subjectName || 'Unknown Subject',
          startTime: formatTime12(schedule.startTime),
          endTime: formatTime12(schedule.endTime),
          colorHex,
        };
      });
  }, [schedules, subjects]);

  const todaysExams = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');

    return schedules
      .filter(
        (schedule) =>
          schedule.scheduleKind === 'exam' &&
          schedule.examDate === today
      )
      .sort((first, second) =>
        (first.startTime || '').localeCompare(second.startTime || '')
      )
      .map((schedule) => {
        const subject = subjects.find(
          (item) => item.name === schedule.subjectName
        );
        const gradient = subject?.color || 'from-gray-400 to-gray-500';

        return {
          courseName: schedule.subjectName || 'Unknown Subject',
          startTime: formatTime12(schedule.startTime),
          endTime: formatTime12(schedule.endTime),
          examType: schedule.examType || 'Examination',
          room: schedule.type === 'online' ? 'Online' : schedule.room || '',
          colorHex:
            gradientToHex[gradient] ||
            stringToColor(schedule.subjectName || 'exam'),
        };
      });
  }, [schedules, subjects]);

  const todayUsesExamSchedule = todaysExams.length > 0;
  const todaysScheduleItems = todayUsesExamSchedule
    ? todaysExams
    : todaysClasses;

  /*
   * B — Real Activity Timeline
   * Combines deadlines and events, then sorts everything by date.
   */
  const activityItems = useMemo(() => {
    const combinedItems = [];

    upcomingDeadlines.forEach((deadline) => {
      const subject = subjects.find(
        (item) => item.name === deadline.subjectName
      );

      const gradient =
        subject?.color || 'from-gray-400 to-gray-500';

      const color =
        gradientToHex[gradient] ||
        stringToColor(deadline.subjectName || 'deadline');

      combinedItems.push({
        id: `deadline-${deadline.id}`,
        title: (
          <button
            type="button"
            onClick={() => navigate(`/deadlines/${deadline.id}`)}
            className="block w-full rounded-md text-left transition hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {deadline.title}
          </button>
        ),
        date: convertToDate(deadline.dueDate),
        done: false,
        color,
        type: 'deadline',
        subjectName: deadline.subjectName || 'Deadline',
      });
    });

    upcomingExamSchedules.forEach((schedule) => {
      const subject = subjects.find(
        (item) => item.name === schedule.subjectName
      );
      const color =
        gradientToHex[subject?.color] ||
        stringToColor(schedule.subjectName || 'exam');

      combinedItems.push({
        id: `exam-schedule-${schedule.id}`,
        title: (
          <button
            type="button"
            onClick={() =>
              navigate(
                `/schedule?view=exams&examType=${encodeURIComponent(
                  schedule.examType || 'Prelims'
                )}`
              )
            }
            className="block w-full rounded-md text-left transition hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {schedule.examType || 'Examination'} Examination
          </button>
        ),
        date: schedule.date,
        done: false,
        color,
        type: 'exam',
        subjectName: schedule.subjectName || 'Exam Schedule',
      });
    });

    upcomingEvents.forEach((event) => {
      const milestones = event.endDate
        ? [
            { key: 'start', title: `Start of ${event.title}`, date: event.date },
            { key: 'end', title: `End of ${event.title}`, date: event.endDate },
          ]
        : [{ key: 'event', title: event.title, date: event.date }];

      milestones.forEach((milestone) => {
        const date = convertToDate(milestone.date);
        if (!date || (isPast(date) && !isToday(date))) return;

        combinedItems.push({
          id: `event-${event.id}-${milestone.key}`,
          title: milestone.title,
          date,
          done: false,
          color: '#f59e0b',
          type: 'event',
          subjectName: '📅 Event',
        });
      });
    });

    upcomingOrganizationDeadlines.forEach((organization) => {
      combinedItems.push({
        id: `organization-${organization.id}`,
        title: `${organization.name} Deadline`,
        date: convertToDate(organization.deadline),
        done: false,
        color: '#f59e0b',
        type: 'organization',
        subjectName: '🏢 Organization',
      });
    });

    return combinedItems
      .sort((first, second) => first.date - second.date)
      .slice(0, 8);
  }, [
    upcomingDeadlines,
    upcomingExamSchedules,
    upcomingEvents,
    upcomingOrganizationDeadlines,
    subjects,
    navigate,
  ]);

  const deadlineChartData = useMemo(() => {
    const now = new Date();
    let intervals;
    let labelFormatter;

    if (deadlineChartRange === 'day') {
      intervals = eachDayOfInterval({
        start: startOfMonth(now),
        end: endOfMonth(now),
      });
      labelFormatter = (date) => format(date, 'd');
    } else if (deadlineChartRange === 'week') {
      intervals = eachWeekOfInterval(
        {
          start: startOfYear(now),
          end: endOfYear(now),
        },
        { weekStartsOn: 1 }
      );
      labelFormatter = (date) => format(date, 'MMM d');
    } else {
      intervals = MONTHS.map((_, monthIndex) => new Date(now.getFullYear(), monthIndex, 1));
      labelFormatter = (date) => format(date, 'MMM');
    }

    return intervals.map((intervalStart, index) => {
      const start = deadlineChartRange === 'day'
        ? intervalStart
        : deadlineChartRange === 'week'
          ? intervalStart
          : new Date(now.getFullYear(), index, 1);
      const end = deadlineChartRange === 'day'
        ? new Date(intervalStart.getFullYear(), intervalStart.getMonth(), intervalStart.getDate(), 23, 59, 59, 999)
        : deadlineChartRange === 'week'
          ? endOfWeek(intervalStart, { weekStartsOn: 1 })
          : new Date(now.getFullYear(), index + 1, 0, 23, 59, 59, 999);

      return {
        label: labelFormatter(intervalStart),
        deadlines:
          dashboardDeadlines.filter((deadline) => {
          const dueDate = convertToDate(deadline.dueDate);
          return dueDate && dueDate >= start && dueDate <= end;
          }).length +
          examSchedules.filter(
            (schedule) => schedule.date >= start && schedule.date <= end
          ).length,
      };
    });
  }, [dashboardDeadlines, examSchedules, deadlineChartRange]);

  const currentOrganization =
    organizations.length > 0
      ? organizations[organizationIndex % organizations.length]
      : null;

  const currentAlbum =
    galleryAlbums.length > 0
      ? galleryAlbums[galleryIndex % galleryAlbums.length]
      : null;

  const currentOrganizationImage = getOrganizationImage(
    currentOrganization
  );

  const currentAlbumCover = getAlbumCover(currentAlbum);

  const showPreviousOrganization = () => {
    if (organizations.length === 0) {
      return;
    }

    setOrganizationIndex((currentIndex) =>
      currentIndex === 0
        ? organizations.length - 1
        : currentIndex - 1
    );
  };

  const showNextOrganization = () => {
    if (organizations.length === 0) {
      return;
    }

    setOrganizationIndex(
      (currentIndex) =>
        (currentIndex + 1) % organizations.length
    );
  };

  const showPreviousAlbum = () => {
    if (galleryAlbums.length === 0) {
      return;
    }

    setGalleryIndex((currentIndex) =>
      currentIndex === 0
        ? galleryAlbums.length - 1
        : currentIndex - 1
    );
  };

  const showNextAlbum = () => {
    if (galleryAlbums.length === 0) {
      return;
    }

    setGalleryIndex(
      (currentIndex) =>
        (currentIndex + 1) % galleryAlbums.length
    );
  };

  const totalStudents = students.length;
  const upcomingDeadlinesCount = upcomingDeadlines.length;
  const upcomingEventsCount = upcomingEvents.length;
  const todayKey = new Date().toDateString();
  const quoteOfTheDay = useMemo(() => {
    const dayNumber = Math.floor(
      new Date(todayKey).getTime() / (1000 * 60 * 60 * 24)
    );

    return QUOTES[Math.abs(dayNumber) % QUOTES.length];
  }, [todayKey]);
  const newAnnouncementsCount = recentAnnouncements.filter(
    (announcement) => {
      const announcementDate = convertToDate(
        announcement.datePosted ||
          announcement.createdAt ||
          announcement.date
      );

      return (
        announcementDate &&
        differenceInDays(new Date(), announcementDate) <= 7
      );
    }
  ).length;

  const currentDate = new Date();
  const currentHour = currentDate.getHours();

  const greeting =
    currentHour < 12
      ? 'Good morning'
      : currentHour < 18
        ? 'Good afternoon'
        : 'Good evening';

  const displayName = user?.name?.trim().split(',').pop().trim() || 'Student';
  const userRole = isAdmin ? 'ADMIN' : 'STUDENT';

  const formattedCurrentDate = currentDate.toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      <motion.section
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-3xl bg-violet-700 p-5 text-white shadow-lg sm:p-6 lg:p-8"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 select-none overflow-hidden opacity-[0.09] sm:opacity-[0.14]"
        >
          <img
            src="/drumpyy-graduation-peek.png"
            alt=""
            draggable={false}
            className="absolute -bottom-3 -right-24 h-auto w-[min(90%,22rem)] max-w-none sm:-bottom-6 sm:-right-32 sm:h-[120%] sm:w-auto lg:-right-36"
          />
        </div>
        <div className="relative z-10 flex flex-col gap-6">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-semibold tracking-wider text-white backdrop-blur-sm">
                {userRole}
              </span>

              <span className="text-xs text-violet-100">
                {formattedCurrentDate}
              </span>
            </div>

            <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              {greeting}, {displayName}! 👋
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-violet-100 sm:text-base">
              {isAdmin
                ? `Manage updates and keep ${BRANDING.section} informed and organized.`
                : `Here’s what’s happening with ${BRANDING.section} today.`}
            </p>
          </div>

          <motion.div
            initial={prefersReducedMotion ? false : 'hidden'}
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: prefersReducedMotion ? 0 : 0.05,
                },
              },
            }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
          >
            {[
              {
                icon: Users,
                label: 'Total Students',
                value: totalStudents,
                tone: 'accent',
                route: '/students',
              },
              {
                icon: ListChecks,
                label: 'Upcoming Deadlines',
                value: upcomingDeadlinesCount,
                tone: 'warning',
                route: '/deadlines',
              },
              {
                icon: PartyPopper,
                label: 'Upcoming Events',
                value: upcomingEventsCount,
                tone: 'info',
                route: '/events',
              },
              {
                icon: Megaphone,
                label: 'New Announcements',
                value: newAnnouncementsCount,
                tone: 'accent',
                route: '/announcements',
              },
              {
                icon: CalendarDays,
                label: 'Weekly Classes',
                value: weeklyClassesCount,
                tone: 'success',
                route: '/schedule',
              },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                variants={{
                  hidden: prefersReducedMotion
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 8 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: prefersReducedMotion ? 0 : 0.25,
                      ease: 'easeOut',
                    },
                  },
                }}
              >
                <StatCard
                  {...statLoadStates[stat.route]}
                  icon={stat.icon}
                  label={stat.label}
                  value={stat.value}
                  tone={stat.tone}
                  variant="hero"
                  onClick={() => navigate(stat.route)}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* 🔽 Deadline Type Breakdown */}
      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-accent" />
            <div>
              <p className="font-semibold text-text-primary">
                Deadline Breakdown
              </p>
              <p className="text-xs text-text-secondary">
                Upcoming deadlines by type
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/deadlines')}
            className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DEADLINE_TYPE_OPTIONS.map((option) => {
            const count = deadlineTypeCounts[option.value] || 0;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => navigate('/deadlines')}
                className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-bg-muted/40 p-4 text-left transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${option.color}20` }}
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: option.color }}
                  />
                </span>
                <div>
                  <p className="text-2xl font-bold text-text-primary">{deadlineState === "loading" ? <Skeleton as="span" className="inline-block h-6 w-8 align-middle" /> : deadlineState === "error" ? "—" : count}</p>
                  <p className="text-xs font-medium text-text-secondary">
                    {option.label}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* C — Recent Announcements Feed */}
      <Card>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-accent" />

            <div>
              <p className="font-semibold text-text-primary">
                Recent Announcements
              </p>

              <p className="text-xs text-text-secondary">
                Latest news and updates for the block
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/announcements')}
            className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <LoadingContent loading={announcementsLoading || classroomPending} hasData={recentAnnouncementFeed.length > 0} error={announcementsError || classroomError} label="Recent announcements" skeleton={<ContentSkeleton kind="announcement-preview" count={3} />}>
{recentAnnouncementFeed.length === 0 ? (
          <div className="rounded-2xl bg-bg-muted p-6 text-center">
            <Megaphone className="mx-auto mb-2 h-8 w-8 text-text-secondary" />

            <p className="text-sm font-medium text-text-primary">
              No recent announcements
            </p>

            <p className="mt-1 text-xs text-text-secondary">
              New announcements will appear here.
            </p>
          </div>
        ) : (
          <div
            role="region"
            aria-label="Recent announcements. Swipe left or right to browse on mobile."
            tabIndex={0}
            className="flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent md:grid md:grid-cols-3 md:overflow-visible md:pb-0"
          >
            {recentAnnouncementFeed.map((announcement, index) => {
              const announcementDate = convertToDate(
                announcement.datePosted ||
                  announcement.createdAt ||
                  announcement.date
              );

              const announcementText =
                announcement.content ||
                announcement.description ||
                announcement.message ||
                'No additional details provided.';
              const announcementImage =
                announcement.images?.find((image) => image?.url)?.url ||
                announcement.imageUrl;

              return (
                <button
                  type="button"
                  key={announcement.id || index}
                  onClick={() =>
                    navigate(
                      announcement.id
                        ? `/announcements?announcement=${encodeURIComponent(String(announcement.id))}`
                        : '/announcements'
                    )
                  }
                  className="min-w-0 shrink-0 basis-[90%] snap-start rounded-2xl border border-border bg-bg-muted p-4 text-left transition duration-200 hover:border-accent/40 hover:shadow-md md:basis-auto md:hover:-translate-y-1"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">
                      Announcement
                    </span>

                    {announcement.pinned && (
                      <span className="text-xs text-status-warning">
                        Pinned
                      </span>
                    )}
                  </div>

                  {announcementImage && (
                    <ContentImage wrapperClassName="h-36 w-full"
                      src={announcementImage}
                      alt=""
                      loading="lazy"
                      className="mb-3 h-36 w-full rounded-xl object-cover"
                    />
                  )}

                  <p className="line-clamp-2 font-semibold text-text-primary">
                    {announcement.title || 'Untitled Announcement'}
                  </p>

                  <RichTextContent
                    html={announcementText}
                    className="mt-2 line-clamp-2 text-sm text-text-secondary"
                  />

                  <p className="mt-4 text-xs text-text-secondary">
                    {announcementDate
                      ? format(announcementDate, 'MMM d, yyyy')
                      : 'Date unavailable'}
                  </p>
                </button>
              );
            })}
          </div>
        )}
</LoadingContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* B — Real Activity Timeline */}
        <div className="md:col-span-2">
          <ActivityTimeline
            items={activityItems}
            title="Upcoming Deadlines & Events"
          />
        </div>

        <div className="space-y-4">
          {/* D — Upcoming Events Quick View */}
          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <PartyPopper className="h-5 w-5 text-status-warning" />

                <div>
                  <p className="font-semibold text-text-primary">
                    Upcoming Events
                  </p>

                  <p className="text-xs text-text-secondary">
                    First Three Events
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/events')}
                className="text-xs font-medium text-accent hover:underline"
              >
                View all
              </button>
            </div>

            <LoadingContent loading={eventsLoading} hasData={events.length > 0} error={eventsError} label="Upcoming events" skeleton={<ContentSkeleton kind="rows" count={3} />}>
{recentUpcomingEvents.length === 0 ? (
              <div className="rounded-xl bg-bg-muted p-4 text-center">
                <p className="text-sm text-text-secondary">
                  No upcoming events yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentUpcomingEvents.map((event, index) => {
                  const eventDate = convertToDate(event.date);

                  return (
                    <button
                      type="button"
                      key={event.id || index}
                      onClick={() =>
                        navigate(
                          event.id
                            ? `/events?event=${encodeURIComponent(event.id)}`
                            : '/events'
                        )
                      }
                      className="flex w-full items-start gap-3 rounded-xl bg-bg-muted p-3 text-left transition hover:bg-accent-soft"
                    >
                      <div className="flex min-w-12 flex-col items-center rounded-xl bg-accent px-2 py-2 text-white">
                        <span className="text-[10px] font-semibold uppercase">
                          {eventDate
                            ? format(eventDate, 'MMM')
                            : 'TBA'}
                        </span>

                        <span className="text-lg font-bold leading-none">
                          {eventDate ? format(eventDate, 'd') : '—'}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text-primary">
                          {event.title || 'Untitled Event'}
                        </p>

                        <p className="mt-1 flex items-center gap-1 text-xs text-text-secondary">
                          <Clock3 className="h-3 w-3" />
                          {event.endDate && eventDate ? `${format(eventDate, 'MMM d')} to ${format(new Date(event.endDate), 'MMM d, yyyy')}` : eventDate ? format(eventDate, 'h:mm a') : 'Time TBA'}
                        </p>

                        {event.location && (
                          <p className="mt-1 flex items-center gap-1 truncate text-xs text-text-secondary">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {event.location}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
</LoadingContent>
          </Card>

          <Card>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              {todayUsesExamSchedule ? 'Today’s Exams' : 'Today’s Classes'}
            </p>

            <LoadingContent loading={schedulesLoading} hasData={schedules.length > 0} error={schedulesError} label="Today’s schedule" skeleton={<ContentSkeleton kind="rows" count={2} />}>
{todaysScheduleItems.length === 0 ? (
              <p className="text-sm text-text-secondary">
                No classes or examinations scheduled for today. 🎉
              </p>
            ) : (
              <ul className="space-y-2">
                {todaysScheduleItems.map((classItem, index) => (
                  <li
                    key={`${classItem.courseName}-${index}`}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: classItem.colorHex,
                      }}
                    />

                    <span className="min-w-0 flex-1 break-words font-medium leading-tight">
                      {classItem.courseName}
                      {todayUsesExamSchedule && (
                        <span className="mt-0.5 block text-[11px] font-normal text-text-secondary">
                          {classItem.examType}{classItem.room ? ` • ${classItem.room}` : ''}
                        </span>
                      )}
                    </span>

                    <span className="ml-auto shrink-0 whitespace-nowrap text-text-secondary">
                      {classItem.startTime} – {classItem.endTime}
                    </span>
                  </li>
                ))}
              </ul>
            )}
</LoadingContent>
            {todayUsesExamSchedule && todaysClasses.length > 0 && (
              <button
                type="button"
                onClick={() => navigate('/schedule?view=classes')}
                className="mt-3 text-xs font-medium text-accent hover:underline"
              >
                View regular class schedule
              </button>
            )}
          </Card>

          <Card>
            <div className="mb-2 flex items-center gap-2">
              <Cake className="h-4 w-4 text-accent" />

              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Quick Actions
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate('/announcements')}
                className="rounded-full bg-accent-soft px-3 py-1.5 text-xs text-accent transition hover:bg-accent/20"
              >
                Post Announcement
              </button>

              <button
                type="button"
                onClick={() => navigate('/deadlines')}
                className="rounded-full bg-status-warning/10 px-3 py-1.5 text-xs text-status-warning transition hover:bg-status-warning/20"
              >
                Add Deadline
              </button>

              <button
                type="button"
                onClick={() => navigate('/students')}
                className="rounded-full bg-status-info/10 px-3 py-1.5 text-xs text-status-info transition hover:bg-status-info/20"
              >
                Add Student
              </button>
            </div>
          </Card>

          <Card className="border-none bg-accent-soft">
            <div className="mb-2 flex items-center gap-2">
              <Quote className="h-4 w-4 text-accent" />

              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                Quote of the Day
              </p>
            </div>

            <p className="text-sm italic text-text-primary">
              &quot;{quoteOfTheDay}&quot;
            </p>
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-base font-semibold text-text-primary sm:text-lg">
              School Deadlines Overview
            </p>

            <p className="mt-1 text-xs text-text-secondary sm:text-sm">
              Number of deadlines {deadlineChartRange === 'day' ? 'per day this month' : `per ${deadlineChartRange} for ${new Date().getFullYear()}`}
            </p>
          </div>

          <div className="flex shrink-0 rounded-lg border border-border bg-bg-muted p-1" role="group" aria-label="Deadline chart range">
            {[
              { value: 'day', label: 'Per day' },
              { value: 'month', label: 'Per month' },
            ].map((range) => (
              <button
                key={range.value}
                type="button"
                onClick={() => setDeadlineChartRange(range.value)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition sm:px-3 ${
                  deadlineChartRange === range.value
                    ? 'bg-bg-surface text-accent shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                aria-pressed={deadlineChartRange === range.value}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {deadlineChartRange !== 'month' && (
          <p className="mb-2 text-sm font-semibold text-text-primary sm:text-base">
            {format(new Date(), 'MMMM yyyy')}
          </p>
        )}

        <LoadingContent loading={deadlinePending} hasData={deadlineHasData} error={deadlineError} label="Deadline chart" skeleton={<Skeleton className="h-56 w-full sm:h-72" />}>
<div className="h-56 w-full overflow-x-auto sm:h-72 sm:overflow-x-hidden">
          <div className="h-full min-w-[720px] sm:min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={deadlineChartData}
                margin={{
                  top: isCompactChart ? 6 : 10,
                  right: isCompactChart ? 0 : 10,
                  left: isCompactChart ? -30 : -20,
                  bottom: isCompactChart ? 4 : 0,
                }}
              >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                opacity={isCompactChart ? 0.16 : 0.25}
              />

              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval={0}
                minTickGap={0}
                tickMargin={8}
                tickFormatter={(label) =>
                  isCompactChart
                    ? COMPACT_MONTHS[label] || label
                    : label
                }
                tick={{
                  fontSize: isCompactChart ? 9 : 12,
                  fill: 'currentColor',
                }}
              />

              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={isCompactChart ? 26 : 40}
                tickCount={isCompactChart ? 4 : 5}
                tick={{
                  fontSize: isCompactChart ? 10 : 12,
                  fill: 'currentColor',
                }}
              />

              <Tooltip
                allowEscapeViewBox={{ x: false, y: false }}
                cursor={{
                  fill: 'rgba(124, 58, 237, 0.08)',
                }}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: isCompactChart ? '10px' : '12px',
                  border: '1px solid rgba(124, 58, 237, 0.2)',
                  padding: isCompactChart ? '7px 9px' : '10px 12px',
                  fontSize: isCompactChart ? '11px' : '12px',
                  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
                }}
                labelStyle={{ color: '#000000' }}
                itemStyle={{ color: '#000000' }}
              />

              <Line
                dataKey="deadlines"
                name="Deadlines"
                fill="#7c3aed"
                stroke="#7c3aed"
                strokeWidth={isCompactChart ? 2 : 3}
                type="monotone"
                dot={{ r: isCompactChart ? 2 : 3, fill: '#7c3aed' }}
                activeDot={{ r: isCompactChart ? 4 : 5 }}
                animationDuration={900}
              />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
</LoadingContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-accent" />

              <div>
                <p className="font-semibold text-text-primary">
                  Organizations
                </p>

              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/organizations')}
              className="text-xs font-medium text-accent hover:underline"
            >
              View all
            </button>
          </div>

          <LoadingContent loading={organizationsLoading} hasData={organizations.length > 0} error={organizationsError} label="Organizations" skeleton={<ContentSkeleton kind="feature" count={1} />}>
{currentOrganization ? (
            <div className="overflow-hidden rounded-2xl bg-bg-muted">
              {currentOrganizationImage ? (
                <ContentImage wrapperClassName="h-48 w-full"
                  src={getOptimizedImageUrl(currentOrganizationImage, {
                    width: 1200,
                  })}
                  alt={currentOrganization.name}
                  className="h-48 w-full object-cover transition duration-500 hover:scale-105"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-48 items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600">
                  <Building2 className="h-14 w-14 text-white/90" />
                </div>
              )}

              <div className="p-5">
                <p className="text-lg font-semibold text-text-primary">
                  {currentOrganization.name}
                </p>

                <p className="mt-2 line-clamp-3 text-sm text-text-secondary">
                  {currentOrganization.description ||
                    'No organization description yet.'}
                </p>

                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={showPreviousOrganization}
                    className="rounded-full bg-bg-surface p-2 text-text-secondary transition hover:text-accent"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="flex shrink-0 items-center justify-center gap-1.5">
                    {getVisibleCarouselIndices(
                      organizations.length,
                      organizationIndex
                    ).map((index) => (
                      <button
                        type="button"
                        key={organizations[index].id || index}
                        onClick={() => setOrganizationIndex(index)}
                        aria-label={`Go to organization ${index + 1}`}
                        aria-current={
                          index === organizationIndex ? 'true' : undefined
                        }
                        data-compact-control="true"
                        className={`h-2 rounded-full transition-all ${
                          index === organizationIndex
                            ? 'w-6 bg-accent'
                            : 'w-2 bg-text-secondary/30'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={showNextOrganization}
                    className="rounded-full bg-bg-surface p-2 text-text-secondary transition hover:text-accent"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-bg-muted p-8 text-center">
              <Building2 className="mx-auto mb-3 h-10 w-10 text-text-secondary" />

              <p className="font-medium text-text-primary">
                No organizations yet
              </p>
            </div>
          )}
</LoadingContent>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Images className="h-5 w-5 text-accent" />

              <div>
                <p className="font-semibold text-text-primary">
                  Gallery Highlights
                </p>

              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/gallery')}
              className="text-xs font-medium text-accent hover:underline"
            >
              View gallery
            </button>
          </div>

          <LoadingContent loading={galleryLoading} hasData={galleryAlbums.length > 0} error={galleryError} label="Gallery albums" skeleton={<ContentSkeleton kind="feature" count={1} />}>
{currentAlbum ? (
            <div className="overflow-hidden rounded-2xl bg-bg-muted">
              {currentAlbumCover ? (
                <ContentImage wrapperClassName="h-48 w-full"
                  src={getOptimizedImageUrl(currentAlbumCover, {
                    width: 1200,
                  })}
                  alt={currentAlbum.title}
                  className="h-48 w-full object-cover transition duration-500 hover:scale-105"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-48 items-center justify-center bg-gradient-to-br from-pink-500 to-violet-600">
                  <Images className="h-14 w-14 text-white/90" />
                </div>
              )}

              <div className="p-5">
                <p className="text-lg font-semibold text-text-primary">
                  {currentAlbum.title}
                </p>

                <p className="mt-2 line-clamp-3 text-sm text-text-secondary">
                  {currentAlbum.description ||
                    'No album description yet.'}
                </p>

                <p className="mt-3 text-xs font-medium text-accent">
                  {currentAlbum.photos?.length || 0} photos
                </p>

                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={showPreviousAlbum}
                    className="rounded-full bg-bg-surface p-2 text-text-secondary transition hover:text-accent"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="flex shrink-0 items-center justify-center gap-1.5">
                    {getVisibleCarouselIndices(
                      galleryAlbums.length,
                      galleryIndex
                    ).map((index) => (
                      <button
                        type="button"
                        key={galleryAlbums[index].id || index}
                        onClick={() => setGalleryIndex(index)}
                        aria-label={`Go to gallery album ${index + 1}`}
                        aria-current={index === galleryIndex ? 'true' : undefined}
                        data-compact-control="true"
                        className={`h-2 rounded-full transition-all ${
                          index === galleryIndex
                            ? 'w-6 bg-accent'
                            : 'w-2 bg-text-secondary/30'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={showNextAlbum}
                    className="rounded-full bg-bg-surface p-2 text-text-secondary transition hover:text-accent"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-bg-muted p-8 text-center">
              <Images className="mx-auto mb-3 h-10 w-10 text-text-secondary" />

              <p className="font-medium text-text-primary">
                No gallery albums yet
              </p>
            </div>
          )}
</LoadingContent>
        </Card>
      </div>

      {false && isAdmin && (
        <Card>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-text-primary">Service Credit Monitor</p>
              <p className="mt-1 text-xs text-text-secondary">
                Make.com and Cloudinary balances, plus app-recorded Firebase usage
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreditHistoryOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-bg-muted px-4 py-2 text-sm font-medium text-text-primary transition hover:border-accent/40 hover:text-accent"
            >
              <History className="h-4 w-4" />
              Show History
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {CREDIT_SERVICES.map((service) => {
              const usage = creditUsage.find((item) => item.id === service.id) || service;
              const total = Math.max(0, Number(usage.total) || 0);
              const current = Math.max(0, Number(usage.current) || 0);
              const used = Math.max(0, total - current);
              const remainingPercentage = total > 0
                ? Math.max(0, Math.min(100, (current / total) * 100))
                : 0;
              const status = getCreditStatus(current, total);
              const chartData = total > 0
                ? [
                    { name: 'Remaining', value: current || 0.0001 },
                    { name: 'Used', value: used || 0.0001 },
                  ]
                : [{ name: 'No data', value: 1 }];

              return (
                <div key={service.id} className="rounded-2xl border border-border bg-bg-muted/40 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-text-primary">{service.name}</p>
                      <p className="text-xs text-text-secondary">{usage.month || 'Month not configured'}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {service.id === 'make' && (
                        <button
                          type="button"
                          onClick={() => void syncGoogleClassroom()}
                          disabled={classroomSyncStatus.syncing}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-accent/20 bg-accent-soft px-2.5 py-2 text-xs font-semibold text-accent transition hover:border-accent/40 hover:bg-accent/10 disabled:cursor-wait disabled:opacity-60"
                          aria-label="Sync Google Classroom through Make.com"
                        >
                          <RefreshCw
                            className={`h-3.5 w-3.5 ${classroomSyncStatus.syncing ? 'animate-spin' : ''}`}
                          />
                          {classroomSyncStatus.syncing ? 'Syncing...' : 'Sync Classroom'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setCreditEditor({ ...service, ...usage, reason: '' })}
                        disabled={service.id === 'firebase'}
                        className="rounded-lg p-2 text-text-secondary transition hover:bg-bg-muted hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Edit ${service.name} usage`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="relative mx-auto h-44 w-full max-w-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={52}
                          outerRadius={70}
                          startAngle={90}
                          endAngle={-270}
                          stroke="none"
                        >
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`${entry.name}-${index}`}
                              fill={total <= 0 ? '#6b7280' : index === 0 ? service.color : '#374151'}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-text-primary">{Math.round(remainingPercentage)}%</span>
                      <span className="text-[10px] uppercase tracking-wide text-text-secondary">remaining</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    {service.id === 'firebase' ? (
                      <>
                        <div><p className="font-semibold text-text-primary">100%</p><p className="text-text-secondary">Quota scale</p></div>
                        <div><p className="font-semibold text-text-primary">{used.toLocaleString(undefined, { maximumFractionDigits: 2 })}%</p><p className="text-text-secondary">Highest used</p></div>
                        <div><p className="font-semibold text-text-primary">{current.toLocaleString(undefined, { maximumFractionDigits: 2 })}%</p><p className="text-text-secondary">Lowest left</p></div>
                      </>
                    ) : (
                      <>
                        <div><p className="font-semibold text-text-primary">{total.toLocaleString()}</p><p className="text-text-secondary">Total</p></div>
                        <div><p className="font-semibold text-text-primary">{used.toLocaleString()}</p><p className="text-text-secondary">Used</p></div>
                        <div><p className="font-semibold text-text-primary">{current.toLocaleString()}</p><p className="text-text-secondary">Left</p></div>
                      </>
                    )}
                  </div>

                  <div className={`mt-4 flex items-center gap-2 rounded-xl bg-bg-muted p-3 text-xs font-medium ${status.tone}`}>
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {status.label}
                  </div>
                  <p className="mt-3 text-xs text-text-secondary">
                    Reset: {usage.resetDate ? format(new Date(`${usage.resetDate}T00:00:00`), 'MMM d, yyyy') : 'Not configured'}
                  </p>
                  <p className="mt-1 text-[11px] text-text-secondary">
                    Updated: {usage.updatedAt ? format(new Date(usage.updatedAt), 'MMM d, yyyy • h:mm a') : 'Never'}
                  </p>
                  {creditSyncErrors[service.id] && (
                    <p className="mt-2 rounded-lg bg-status-danger/10 px-3 py-2 text-[11px] text-status-danger">
                      Sync error: {creditSyncErrors[service.id]}
                    </p>
                  )}
                  {service.id === 'make' && classroomSyncStatus.message && (
                    <p className="mt-2 rounded-lg bg-status-success/10 px-3 py-2 text-[11px] text-status-success">
                      {classroomSyncStatus.message}
                    </p>
                  )}
                  {service.id === 'make' && classroomSyncStatus.error && (
                    <p className="mt-2 rounded-lg bg-status-danger/10 px-3 py-2 text-[11px] text-status-danger">
                      Sync error: {classroomSyncStatus.error}
                    </p>
                  )}
                  {service.id === 'firebase' && firebaseUsageBreakdown && (
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-bg-muted p-3 text-center text-[11px]">
                      <div><p className="font-semibold text-text-primary">{firebaseUsageBreakdown.reads.toLocaleString()} / 50k</p><p className="text-text-secondary">Reads</p></div>
                      <div><p className="font-semibold text-text-primary">{firebaseUsageBreakdown.writes.toLocaleString()} / 20k</p><p className="text-text-secondary">Writes</p></div>
                      <div><p className="font-semibold text-text-primary">{firebaseUsageBreakdown.deletes.toLocaleString()} / 20k</p><p className="text-text-secondary">Deletes</p></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {isAdmin && creditEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setCreditEditor(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-border bg-bg-surface p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <div><p className="font-semibold text-text-primary">Update {creditEditor.name}</p><p className="text-xs text-text-secondary">Record the current monthly balance</p></div>
              <button type="button" onClick={() => setCreditEditor(null)} className="rounded-lg p-2 text-text-secondary hover:bg-bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm text-text-secondary">Total credits<input type="number" min="0" value={creditEditor.total} onChange={(event) => setCreditEditor({ ...creditEditor, total: event.target.value })} className="mt-1 w-full rounded-xl border border-border bg-bg-muted px-3 py-2 text-text-primary outline-none focus:border-accent" /></label>
              <label className="text-sm text-text-secondary">Current credits<input type="number" min="0" value={creditEditor.current} onChange={(event) => setCreditEditor({ ...creditEditor, current: event.target.value })} className="mt-1 w-full rounded-xl border border-border bg-bg-muted px-3 py-2 text-text-primary outline-none focus:border-accent" /></label>
              <label className="text-sm text-text-secondary">Month<input type="month" value={creditEditor.monthValue || ''} onChange={(event) => setCreditEditor({ ...creditEditor, monthValue: event.target.value, month: event.target.value ? format(new Date(`${event.target.value}-01T00:00:00`), 'MMMM yyyy') : '' })} className="mt-1 w-full rounded-xl border border-border bg-bg-muted px-3 py-2 text-text-primary outline-none focus:border-accent" /></label>
              <label className="text-sm text-text-secondary">Reset date<input type="date" value={creditEditor.resetDate || ''} onChange={(event) => setCreditEditor({ ...creditEditor, resetDate: event.target.value })} className="mt-1 w-full rounded-xl border border-border bg-bg-muted px-3 py-2 text-text-primary outline-none focus:border-accent" /></label>
            </div>
            <label className="mt-4 block text-sm text-text-secondary">Why did the balance change?<textarea rows="3" value={creditEditor.reason || ''} onChange={(event) => setCreditEditor({ ...creditEditor, reason: event.target.value })} placeholder="e.g., Daily Google Classroom synchronization" className="mt-1 w-full resize-none rounded-xl border border-border bg-bg-muted px-3 py-2 text-text-primary outline-none focus:border-accent" /></label>
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setCreditEditor(null)} className="rounded-xl border border-border px-4 py-2 text-sm text-text-secondary">Cancel</button><button type="button" onClick={saveCreditUsage} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white">Save Update</button></div>
          </div>
        </div>
      )}

      {isAdmin && creditHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setCreditHistoryOpen(false)}>
          <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-bg-surface shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-5"><div><p className="font-semibold text-text-primary">Credit Usage History</p><p className="text-xs text-text-secondary">Latest 100 balance updates on this device</p></div><button type="button" onClick={() => setCreditHistoryOpen(false)} className="rounded-lg p-2 text-text-secondary hover:bg-bg-muted"><X className="h-5 w-5" /></button></div>
            <div className="max-h-[65vh] space-y-3 overflow-y-auto p-5">
              {firebaseUsageBreakdown?.history?.length > 0 && (
                <div className="mb-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Firebase app-recorded daily usage</p>
                  <div className="space-y-2">
                    {firebaseUsageBreakdown.history.map((entry) => (
                      <div key={`firebase-${entry.id}`} className="rounded-xl border border-border bg-bg-muted p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-text-primary">Firebase · {entry.day}</p>
                          <p className="text-xs text-text-secondary">Estimated from this app</p>
                        </div>
                        <p className="mt-2 text-sm text-text-secondary">
                          {Number(entry.reads || 0).toLocaleString()} reads · {Number(entry.writes || 0).toLocaleString()} writes · {Number(entry.deletes || 0).toLocaleString()} deletes
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {creditHistory.length === 0 ? <p className="py-8 text-center text-sm text-text-secondary">No credit updates recorded yet.</p> : creditHistory.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-border bg-bg-muted p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-text-primary">{entry.service}</p><p className="text-xs text-text-secondary">{format(new Date(entry.updatedAt), 'MMM d, yyyy • h:mm a')}</p></div><p className="mt-2 text-sm text-text-primary">{entry.previous.toLocaleString()} → {entry.current.toLocaleString()} <span className="text-status-danger">({entry.consumed.toLocaleString()} consumed)</span></p><p className="mt-1 text-sm text-text-secondary">{entry.reason}</p><p className="mt-2 text-xs text-text-secondary">Updated by {entry.updatedBy}</p></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
