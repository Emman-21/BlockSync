import { LoadingContent, ContentSkeleton, Skeleton } from "../components/ui/Skeleton";
import useContentLoadState from "../hooks/useContentLoadState";
// src/pages/Calendar.jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarClock,
  Clock,
  Calendar as CalendarIcon,
  PartyPopper,
  Users,
  ExternalLink,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
} from 'date-fns';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useDeadlinesStore } from '../store/useDeadlinesStore';
import { useEventsStore } from '../store/useEventsStore';
import { useOrganizationsStore } from '../store/useOrganizationsStore';
import { useSubjectsStore } from '../store/useSubjectsStore';
import { useScheduleStore } from '../store/useScheduleStore';
import { useClassroomContentsStore } from '../store/useClassroomContentsStore';
import { buildClassroomDeadlines } from '../utils/classroomDeadlines';
import {
  DEADLINE_TYPES,
  getDeadlineTypeColor,
  getDeadlineTypeLabel,
  isSpecialDeadlineType,
} from '../utils/deadlineTypes';

function clsx(...classes) {
  return classes.filter(Boolean).join(' ');
}

const formatTimeTo12Hour = (time) => {
  if (!time) return '';
  const [hourValue, minute = '00'] = String(time).split(':');
  const hour = Number(hourValue);
  const period = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${minute} ${period}`;
};

const SUBJECT_COLOR_HEX = {
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
  'from-gray-400 to-gray-500': '#64748b',
};

// 🔽 Legend configuration
const LEGEND_ITEMS = [
  { color: '#ef4444', label: 'Deadlines' },
  { color: '#f97316', label: 'Laboratory' },
  { color: '#06b6d4', label: 'Quiz' },
  { color: '#ec4899', label: 'Final Project' },
  { color: '#8b5cf6', label: 'Exams' },
  { color: '#22c55e', label: 'Events' },
  { color: '#f59e0b', label: 'Organizations' },
];

export default function Calendar() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { deadlines, load: loadDeadlines, loading: deadlinesLoading, firebaseError: deadlinesError } = useDeadlinesStore();
  const { events, load: loadEvents, loading: eventsLoading, firebaseError: eventsError } = useEventsStore();
  const { organizations, load: loadOrganizations, loading: organizationsLoading, firebaseError: organizationsError } = useOrganizationsStore();
  const { subjects, load: loadSubjects, loading: subjectsLoading, firebaseError: subjectsError } = useSubjectsStore();
  const { schedules, load: loadSchedules, loading: schedulesLoading, firebaseError: schedulesError } = useScheduleStore();
  const { contents: classroomContents, load: loadClassroomContents, loading: classroomLoading, error: classroomError, unsubscribe: classroomSubscription } =
    useClassroomContentsStore();

  useEffect(() => {
    try {
      const unsub1 = loadDeadlines ? loadDeadlines() : null;
      const unsub2 = loadEvents ? loadEvents() : null;
      const unsub3 = loadOrganizations ? loadOrganizations() : null;
      const unsub4 = loadSubjects ? loadSubjects() : null;
      const unsub5 = loadSchedules ? loadSchedules() : null;
      const unsub6 = loadClassroomContents ? loadClassroomContents() : null;
      return () => {
        if (unsub1 && typeof unsub1 === 'function') unsub1();
        if (unsub2 && typeof unsub2 === 'function') unsub2();
        if (unsub3 && typeof unsub3 === 'function') unsub3();
        if (unsub4 && typeof unsub4 === 'function') unsub4();
        if (unsub5 && typeof unsub5 === 'function') unsub5();
        if (unsub6 && typeof unsub6 === 'function') unsub6();
      };
    } catch (error) {
      console.error('❌ Calendar load error:', error);
    }
  }, [
    loadDeadlines,
    loadEvents,
    loadOrganizations,
    loadSubjects,
    loadSchedules,
    loadClassroomContents,
  ]);

  const itemsByDate = useMemo(() => {
    const map = new Map();

    try {
      const allDeadlines = [
        ...(deadlines || []),
        ...buildClassroomDeadlines(classroomContents, subjects),
      ];

      if (allDeadlines.length > 0) {
        allDeadlines.forEach((d) => {
          try {
            const date = new Date(d.dueDate);
            if (isNaN(date)) return;
            const key = format(date, 'yyyy-MM-dd');
            if (!map.has(key)) map.set(key, []);

            const deadlineType = d.type || DEADLINE_TYPES.REGULAR;
            const typeColor = isSpecialDeadlineType(deadlineType)
              ? getDeadlineTypeColor(deadlineType)
              : '#ef4444';

            map.get(key).push({
              id: d.id,
              type: 'deadline',
              deadlineType,
              title: d.title || 'Untitled',
              date: date,
              subjectName: d.subjectName || '',
              subjectColor:
                SUBJECT_COLOR_HEX[
                  subjects.find((subject) => subject.name === d.subjectName)?.color
                ] || '#ef4444',
              color: typeColor,
              link: `/deadlines/${d.id}`,
            });
          } catch (e) {
            console.warn('Error processing deadline:', d.id, e);
          }
        });
      }

      schedules
        .filter((schedule) => schedule.scheduleKind === 'exam' && schedule.examDate)
        .forEach((schedule) => {
          try {
            const date = new Date(
              `${schedule.examDate}T${schedule.startTime || '00:00'}:00`
            );
            if (isNaN(date)) return;
            const key = format(date, 'yyyy-MM-dd');
            if (!map.has(key)) map.set(key, []);
            map.get(key).push({
              id: `exam-schedule-${schedule.id}`,
              type: 'exam',
              title: `${schedule.examType || 'Prelims'} Examination`,
              date,
              startTime: schedule.startTime || '',
              endTime: schedule.endTime || '',
              subjectName: schedule.subjectName || '',
              subjectColor:
                SUBJECT_COLOR_HEX[
                  subjects.find((subject) => subject.name === schedule.subjectName)?.color
                ] || '#8b5cf6',
              color: '#8b5cf6',
              room:
                schedule.type === 'online'
                  ? 'Online'
                  : schedule.room || 'Room not specified',
              link: `/deadlines/exam-schedule-${schedule.id}`,
            });
          } catch (error) {
            console.warn('Error processing exam schedule:', schedule.id, error);
          }
        });

      if (events && events.length > 0) {
        events.forEach((e) => {
          try {
            const title = e.title || 'Untitled';
            const milestones = e.endDate
              ? [
                  { key: 'start', title: `Start of ${title}`, date: e.date },
                  { key: 'end', title: `End of ${title}`, date: e.endDate },
                ]
              : [{ key: 'event', title, date: e.date }];
            milestones.forEach((milestone) => {
              const date = new Date(milestone.date);
              if (isNaN(date)) return;
              const key = format(date, 'yyyy-MM-dd');
              if (!map.has(key)) map.set(key, []);
              map.get(key).push({
                id: `${e.id}-${milestone.key}`,
                type: 'event',
                title: milestone.title,
                date,
                subjectName: 'Event',
                color: '#22c55e',
                link: '/events?event=' + encodeURIComponent(e.id),
              });
            });
          } catch (e) {
            console.warn('Error processing event:', e.id, e);
          }
        });
      }

      if (organizations && organizations.length > 0) {
        organizations.forEach((o) => {
          try {
            if (!o.deadline) return;
            const date = new Date(o.deadline);
            if (isNaN(date)) return;
            const key = format(date, 'yyyy-MM-dd');
            if (!map.has(key)) map.set(key, []);
            map.get(key).push({
              id: o.id,
              type: 'organization',
              title: o.name ? `${o.name} Deadline` : 'Deadline',
              date: date,
              subjectName: 'Organization',
              color: '#f59e0b',
              link: `/organizations`,
            });
          } catch (e) {
            console.warn('Error processing organization:', o.id, e);
          }
        });
      }
    } catch (error) {
      console.error('❌ Error building itemsByDate:', error);
    }

    map.forEach((items) => {
      items.sort((a, b) => a.date.getTime() - b.date.getTime());
    });

    return map;
  }, [deadlines, events, organizations, schedules, subjects, classroomContents, currentMonth]);

  const monthDays = useMemo(() => {
    try {
      const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } catch (error) {
      console.error('❌ Error generating month days:', error);
      return [];
    }
  }, [currentMonth]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const calendarError = deadlinesError || eventsError || organizationsError || subjectsError || schedulesError || classroomError;
  const calendarLoading = deadlinesLoading || eventsLoading || organizationsLoading || subjectsLoading || schedulesLoading || classroomLoading || (!classroomSubscription && !classroomError);
  const calendarState = useContentLoadState({ loading: calendarLoading, hasData: itemsByDate.size > 0, error: calendarError });
  const selectedDayItems = selectedDay ? itemsByDate.get(format(selectedDay.date, "yyyy-MM-dd")) || [] : [];

  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const handleDayClick = (day) => {
    try {
      const key = format(day, 'yyyy-MM-dd');
      const items = itemsByDate.get(key) || [];
      setSelectedDay({ date: day, items });
      setModalOpen(true);
    } catch (error) {
      console.error('❌ Error opening day detail:', error);
    }
  };

  const formatDate = (date) => {
    try {
      return format(date, 'MMMM yyyy');
    } catch {
      return '';
    }
  };

  if (!Array.isArray(monthDays) || monthDays.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="font-display font-semibold text-2xl">Calendar</h1>
        <Card hoverable={false}>
          <div className="text-center py-12">
            <CalendarIcon className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            <p className="text-text-secondary">
              Unable to load calendar. Please try refreshing.
            </p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Refresh
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5 overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display font-semibold text-2xl">Calendar</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Overview of all deadlines, exams, events, and organization deadlines
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handleToday}
            size="sm"
            className="w-full justify-center sm:w-auto"
          >
            <CalendarDays className="w-4 h-4" /> Today
          </Button>
        </div>
      </div>

      {/* Month navigator + legend */}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid w-full grid-cols-[2.75rem_1fr_2.75rem] items-center gap-1 sm:flex sm:w-auto sm:gap-2">
          <button
            onClick={handlePrevMonth}
            className="grid h-11 w-11 place-items-center rounded-xl transition hover:bg-bg-muted"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-center font-display text-base font-semibold sm:text-left sm:text-xl">
            {formatDate(currentMonth)}
          </h2>
          <button
            onClick={handleNextMonth}
            className="grid h-11 w-11 place-items-center rounded-xl transition hover:bg-bg-muted"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 🔽 Updated legend */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:text-sm text-text-secondary">
          {LEGEND_ITEMS.map((item) => (
            <span key={item.label} className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {calendarError && <p role="alert" className="rounded-xl border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">Some calendar sources could not be loaded. Available items remain visible.</p>}
      {calendarState === "loading" && <span role="status" className="sr-only">Loading calendar items…</span>}
      {/* Calendar grid */}
      <div className="w-full overflow-hidden rounded-xl border border-border bg-bg-surface p-1 sm:p-2">
        <div className="w-full">
          <div className="grid grid-cols-7 gap-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div
                key={d}
                className="text-center font-semibold text-xs sm:text-sm text-text-secondary py-2"
              >
                <span className="sm:hidden">{d.slice(0, 1)}</span>
                <span className="hidden sm:inline">{d}</span>
              </div>
            ))}
            {monthDays.map((day) => {
              try {
                const key = format(day, 'yyyy-MM-dd');
                const items = itemsByDate.get(key) || [];
                const visibleItems = [
                  ...items.filter((item) => item.type === 'event'),
                  ...items.filter((item) => item.type !== 'event'),
                ];
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isTodayDate = isToday(day);
                return (
                  <div
                    key={day.toString()}
                    onClick={() => handleDayClick(day)}
                    className={clsx(
                      'min-h-[52px] min-w-0 cursor-pointer rounded-lg border border-border p-1 transition hover:shadow-card sm:min-h-[80px] sm:p-2',
                      !isCurrentMonth && 'opacity-40',
                      isTodayDate && 'border-accent bg-accent-soft/20'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={clsx(
                          'text-xs font-medium sm:text-sm',
                          isTodayDate && 'text-accent'
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      {items.length > 0 && (
                        <span className="hidden text-xs text-text-secondary sm:inline">
                          {items.length}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-0.5 sm:gap-1">
                      {calendarState === "loading" && <Skeleton className="h-2 w-5 sm:h-3 sm:w-8" />}
                      {visibleItems.map((item, idx) => (
                        <span
                          key={idx}
                          className="h-1.5 w-1.5 shrink-0 rounded-full sm:h-2 sm:w-2"
                          style={{ backgroundColor: item.color }}
                          title={
                            item.type === 'deadline' &&
                            isSpecialDeadlineType(item.deadlineType)
                              ? `${getDeadlineTypeLabel(item.deadlineType)}: ${item.title}`
                              : item.title
                          }
                        />
                      ))}
                    </div>
                  </div>
                );
              } catch (error) {
                console.error('Error rendering day cell:', error);
                return (
                  <div
                    key={day.toString()}
                    className="border border-border rounded-lg p-2 min-h-[80px]"
                  >
                    <span className="text-sm">{format(day, 'd')}</span>
                  </div>
                );
              }
            })}
          </div>
        </div>
      </div>

      {/* Day detail modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedDay ? format(selectedDay.date, 'EEEE, MMMM d, yyyy') : 'Day details'}
        maxWidth="max-w-md"
      >
        {selectedDay && (
          <div className="space-y-3">
            <LoadingContent key={selectedDay?.date?.toString()} loading={calendarLoading} hasData={selectedDayItems.length > 0} error={calendarError} label="Calendar day items" skeleton={<ContentSkeleton kind="rows" count={3} />}>
{selectedDayItems.length === 0 ? (
              <p className="text-sm text-text-secondary">No items for this day.</p>
            ) : (
              selectedDayItems.map((item, idx) => {
                const iconMap = {
                  deadline: <Clock className="w-4 h-4 text-red-500" />,
                  exam: <CalendarClock className="w-4 h-4 text-violet-500" />,
                  event: <PartyPopper className="w-4 h-4 text-green-500" />,
                  organization: <Users className="w-4 h-4 text-amber-500" />,
                };
                const isLab =
                  item.type === 'deadline' &&
                  item.deadlineType === DEADLINE_TYPES.LABORATORY;
                const isQuiz =
                  item.type === 'deadline' &&
                  item.deadlineType === DEADLINE_TYPES.QUIZ;
                const isFinalProject =
                  item.type === 'deadline' &&
                  item.deadlineType === DEADLINE_TYPES.FINAL_PROJECT;

                return (
                  <div
                    key={idx}
                    className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl bg-bg-muted p-3 transition hover:bg-bg-muted/70"
                    onClick={() => {
                      setModalOpen(false);
                      navigate(item.link);
                    }}
                  >
                    <div className="shrink-0">
                      {iconMap[item.type] || <CalendarIcon className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug text-text-primary">
                        {item.title}
                      </p>

                      {item.type === 'exam' ? (
                        <div className="mt-2 space-y-1.5">
                          {item.subjectName && (
                            <span
                              className="inline-block max-w-full truncate rounded-full px-2.5 py-1 text-xs font-medium"
                              style={{
                                backgroundColor: `${item.subjectColor}26`,
                                color: item.subjectColor,
                              }}
                            >
                              {item.subjectName}
                            </span>
                          )}
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-text-secondary">
                            <span className="whitespace-nowrap">
                              {formatTimeTo12Hour(item.startTime)} -{' '}
                              {formatTimeTo12Hour(item.endTime)}
                            </span>
                            <span>•</span>
                            <span className="break-words">{item.room}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xs text-text-secondary">
                          <span>{item.endDate ? `${format(item.date, 'MMM d, yyyy')} to ${format(item.endDate, 'MMM d, yyyy')}` : format(item.date, 'h:mm a')}</span>

                          {isLab && (
                            <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                              Laboratory
                            </span>
                          )}
                          {isQuiz && (
                            <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                              Quiz
                            </span>
                          )}
                          {isFinalProject && (
                            <span className="rounded-full bg-pink-500/15 px-2 py-0.5 text-[11px] font-semibold text-pink-600 dark:text-pink-400">
                              Final Project
                            </span>
                          )}

                          {item.type === 'deadline' && item.subjectName && (
                            <span
                              className="max-w-44 truncate rounded-full px-2 py-0.5 capitalize"
                              style={{
                                backgroundColor: `${item.subjectColor}26`,
                                color: item.subjectColor,
                              }}
                            >
                              {item.subjectName}
                            </span>
                          )}
                          {item.type !== 'deadline' && (
                            <span className="capitalize">{item.type}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <ExternalLink className="w-4 h-4 text-text-secondary shrink-0" />
                  </div>
                );
              })
            )}
</LoadingContent>
          </div>
        )}
      </Modal>
    </div>
  );
}
