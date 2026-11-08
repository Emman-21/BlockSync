import useContentLoadState from "../hooks/useContentLoadState";
import { LoadingContent, ContentSkeleton, Skeleton } from "../components/ui/Skeleton";
import DraftControls from '../offline/DraftControls';
import { removeDraft } from '../offline/device';
import { useConnection } from '../offline/status';
// src/pages/Deadlines.jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  CalendarClock,
  AlertCircle,
  Pencil,
  Trash2,
  CloudUpload,
  FileText,
  X,
  ExternalLink,
} from 'lucide-react';
import { format, isToday, differenceInDays } from 'date-fns';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import RichTextEditor from '../components/ui/RichTextEditor';
import RichTextContent from '../components/ui/RichTextContent';
import { useAuth } from '../context/AuthContext';
import { useDeadlinesStore } from '../store/useDeadlinesStore';
import { useSubjectsStore } from '../store/useSubjectsStore';
import { useClassroomContentsStore } from '../store/useClassroomContentsStore';
import { useSubmissionsStore } from '../store/useSubmissionsStore';
import { useScheduleStore } from '../store/useScheduleStore';
import { buildClassroomDeadlines } from '../utils/classroomDeadlines';
import useDeadlineClock from '../hooks/useDeadlineClock';
import {
  DEADLINE_TYPES,
  DEADLINE_TYPE_OPTIONS,
  getDeadlineTypeLabel,
} from '../utils/deadlineTypes';

const SUBJECT_COLORS = [
  'bg-violet-500',
  'bg-pink-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-red-500',
  'bg-teal-500',
  'bg-fuchsia-500',
  'bg-sky-500',
  'bg-lime-500',
  'bg-amber-500',
];

const LEGACY_SUBJECT_COLOR_MAP = {
  'from-purple-500 to-indigo-500': 'bg-violet-500',
  'from-pink-500 to-rose-500': 'bg-pink-500',
  'from-blue-500 to-cyan-500': 'bg-blue-500',
  'from-green-500 to-emerald-500': 'bg-emerald-500',
  'from-red-500 to-orange-500': 'bg-red-500',
  'from-teal-500 to-cyan-500': 'bg-teal-500',
  'from-fuchsia-500 to-pink-500': 'bg-fuchsia-500',
  'from-sky-500 to-blue-500': 'bg-sky-500',
  'from-lime-500 to-green-500': 'bg-lime-500',
  'from-amber-500 to-yellow-500': 'bg-amber-500',
  'from-gray-400 to-gray-500': 'bg-slate-500',
};

const getSubjectColorClass = (color) => {
  const value = String(color || '').trim();
  if (!value) return 'bg-slate-500';
  if (value.startsWith('bg-')) return value;
  return LEGACY_SUBJECT_COLOR_MAP[value] || 'bg-slate-500';
};

const DEADLINE_STATUS = {
  UPCOMING: 'upcoming',
  NO_DATE: 'no-date',
  COMPLETED: 'completed',
};

const STATUS_LABELS = {
  [DEADLINE_STATUS.UPCOMING]: 'Upcoming',
  [DEADLINE_STATUS.NO_DATE]: 'No Fixed Deadline',
  [DEADLINE_STATUS.COMPLETED]: 'Completed',
};

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

const TYPE_BADGE_CLASSES = {
  [DEADLINE_TYPES.LABORATORY]:
    'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  [DEADLINE_TYPES.QUIZ]:
    'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  [DEADLINE_TYPES.FINAL_PROJECT]:
    'bg-pink-500/15 text-pink-600 dark:text-pink-400',
};

function getDeadlineDraftScope(deadlineId, subjectName, subjects) {
  const subject = subjects.find((item) => item.name === subjectName);
  return `deadlines:${deadlineId || 'new'}:${subject?.semesterId || 'general'}:${subject?.id || subjectName || 'general'}`;
}

export default function Deadlines() {
  const navigate = useNavigate();
  const online = useConnection(state => state.online);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const { isAdmin, user } = useAuth();
  const {
    deadlines,
    load: loadDeadlines,
    loading: deadlinesLoading,
    firebaseError: deadlinesError,
    addDeadline,
    updateDeadline,
    deleteDeadline,
    syncToFirebase: syncDeadlines,
    firebaseEmpty: deadlinesEmpty,
  } = useDeadlinesStore();
  const {
    contents: classroomContents,
    loading: classroomLoading,
    error: classroomError,
    load: loadClassroomContents,
  } = useClassroomContentsStore();

  const {
    subjects,
    load: loadSubjects,
    loading: subjectsLoading,
    firebaseError: subjectsError,
  } = useSubjectsStore();
  const {
    submissions,
    loadStudentSubmissions,
    saveSubmission,
    loading: progressLoading,
    errorMessage: progressError,
    savingIds = {},
  } = useSubmissionsStore();
  const {
    schedules,
    load: loadSchedules,
    loading: schedulesLoading,
    firebaseError: schedulesError,
    deleteSchedule,
  } = useScheduleStore();

  const studentId = user?.studentId || '';
  const isStudent = user?.role === 'student' || user?.isGuest;

  const [activeStatusTab, setActiveStatusTab] = useState(DEADLINE_STATUS.UPCOMING);
  const [typeFilter, setTypeFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(null);
  const [deadlineDraftScope, setDeadlineDraftScope] = useState('');
  const [deadlineForm, setDeadlineForm] = useState({
    subjectName: '',
    title: '',
    description: '',
    dueDate: '',
    noFixedDeadline: false,
    hour: '12',
    minute: '00',
    ampm: 'PM',
    attachments: [],
    type: DEADLINE_TYPES.REGULAR,
  });

  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    const unsub1 = loadDeadlines();
    const unsub2 = loadSubjects();
    const unsub3 = loadSchedules();
    loadClassroomContents();
    return () => {
      unsub1();
      unsub2();
      unsub3?.();
    };
  }, [loadDeadlines, loadSubjects, loadSchedules, loadClassroomContents]);

  useEffect(() => {
    if (isStudent) return loadStudentSubmissions(studentId);
  }, [isStudent, studentId, loadStudentSubmissions]);

  const classroomDeadlines = useMemo(
    () => buildClassroomDeadlines(classroomContents, subjects),
    [classroomContents, subjects]
  );

  const examScheduleDeadlines = useMemo(
    () =>
      schedules
        .filter((schedule) => schedule.scheduleKind === 'exam' && schedule.examDate)
        .map((schedule) => ({
          id: `exam-schedule-${schedule.id}`,
          sourceScheduleId: schedule.id,
          isExamSchedule: true,
          subjectName: schedule.subjectName,
          examType: schedule.examType || 'Prelims',
          title: `${schedule.examType || 'Prelims'} Examination`,
          description: schedule.description || '',
          dueDate: `${schedule.examDate}T${schedule.startTime || '00:00'}:00`,
          examDate: schedule.examDate,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          room: schedule.room || '',
          type: schedule.type || 'f2f',
          attachments: Array.isArray(schedule.attachments) ? schedule.attachments : [],
        }))
        .filter((deadline) => !Number.isNaN(new Date(deadline.dueDate).getTime())),
    [schedules]
  );

  const allDeadlines = useMemo(
    () => [...examScheduleDeadlines, ...classroomDeadlines, ...deadlines],
    [examScheduleDeadlines, classroomDeadlines, deadlines]
  );
  const now = useDeadlineClock(allDeadlines);

  const sortedDeadlines = useMemo(() => {
    const upcoming = allDeadlines
      .filter((d) => {
        if (!d.dueDate) return false;
        const dueTime = new Date(d.dueDate).getTime();
        return Number.isFinite(dueTime) && dueTime >= now.getTime();
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    const withoutDate = allDeadlines.filter((d) => !d.dueDate || d.noFixedDeadline);

    const past = allDeadlines
      .filter((d) => {
        if (!d.dueDate) return false;
        const dueTime = new Date(d.dueDate).getTime();
        return Number.isFinite(dueTime) && dueTime < now.getTime();
      })
      .sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));

    return [...upcoming, ...withoutDate, ...past];
  }, [allDeadlines, now]);

  const getDeadlineStatus = (date) => {
    if (!date) return 'no-date';
    const dueDate = new Date(date);
    if (dueDate.getTime() < now.getTime()) return 'past';
    if (isToday(dueDate)) return 'today';
    const days = differenceInDays(dueDate, now);
    if (days <= 3) return 'urgent';
    return 'upcoming';
  };

  const isFinishedByStudent = (deadline) =>
    isStudent && submissions[`${studentId}_${deadline.id}`]?.status === 'completed';

  const toggleDeadlineFinished = async (deadline) => {
    if (!isStudent) return;
    const isFinished = isFinishedByStudent(deadline);
    try {
      await saveSubmission(studentId, deadline.id, isFinished ? null : 'completed');
    } catch {
      // The progress error below keeps failed saves visible without changing the status.
    }
  };

  const formatDateDisplay = (dateString) => {
    const date = new Date(dateString);
    return format(date, 'MMM d, yyyy • h:mm a');
  };

  const handleAddDeadline = () => {
    setEditingDeadline(null);
    const subjectName = subjects[0]?.name || '';
    setDeadlineDraftScope(getDeadlineDraftScope(null, subjectName, subjects));
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;

    setDeadlineForm({
      subjectName,
      title: '',
      description: '',
      dueDate: format(now, 'yyyy-MM-dd'),
      noFixedDeadline: false,
      hour: String(hour12),
      minute: String(minutes).padStart(2, '0'),
      ampm: ampm,
      attachments: [],
      type: DEADLINE_TYPES.REGULAR,
    });
    setAttachmentName('');
    setAttachmentUrl('');
    setModalOpen(true);
  };

  const handleEditDeadline = (deadline) => {
    setEditingDeadline(deadline);
    setDeadlineDraftScope(getDeadlineDraftScope(deadline.id, deadline.subjectName, subjects));
    const hasFixedDeadline = Boolean(deadline.dueDate) && !deadline.noFixedDeadline;
    const date = hasFixedDeadline ? new Date(deadline.dueDate) : new Date();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;

    setDeadlineForm({
      subjectName: deadline.subjectName || '',
      title: deadline.title || '',
      description: deadline.description || '',
      dueDate: hasFixedDeadline ? format(date, 'yyyy-MM-dd') : '',
      noFixedDeadline: !hasFixedDeadline,
      hour: String(hour12),
      minute: String(minutes).padStart(2, '0'),
      ampm: ampm,
      attachments: deadline.attachments || [],
      type: deadline.type || DEADLINE_TYPES.REGULAR,
    });
    setAttachmentName('');
    setAttachmentUrl('');
    setModalOpen(true);
  };

  const addAttachment = () => {
    if (attachmentName.trim() && attachmentUrl.trim()) {
      const newAttachments = [
        ...deadlineForm.attachments,
        { name: attachmentName.trim(), url: attachmentUrl.trim() },
      ];
      setDeadlineForm({ ...deadlineForm, attachments: newAttachments });
      setAttachmentName('');
      setAttachmentUrl('');
    }
  };

  const removeAttachment = (index) => {
    const newAttachments = deadlineForm.attachments.filter((_, i) => i !== index);
    setDeadlineForm({ ...deadlineForm, attachments: newAttachments });
  };

  const handleSaveDeadline = async () => {
    if (saving) return;
    if (!deadlineForm.title.trim()) return;
    if (!deadlineForm.noFixedDeadline && !deadlineForm.dueDate) return;

    let hour = parseInt(deadlineForm.hour) || 12;
    let minute = parseInt(deadlineForm.minute) || 0;
    if (hour < 1) hour = 1;
    if (hour > 12) hour = 12;
    if (minute < 0) minute = 0;
    if (minute > 59) minute = 59;

    let hour24 = hour;
    if (deadlineForm.ampm === 'PM' && hour !== 12) hour24 = hour + 12;
    if (deadlineForm.ampm === 'AM' && hour === 12) hour24 = 0;

    const dueDateTime = deadlineForm.noFixedDeadline
      ? null
      : new Date(deadlineForm.dueDate);
    dueDateTime?.setHours(hour24, minute, 0, 0);

    const data = {
      subjectName: deadlineForm.subjectName,
      title: deadlineForm.title.trim(),
      description: deadlineForm.description,
      dueDate: dueDateTime ? dueDateTime.toISOString() : null,
      noFixedDeadline: deadlineForm.noFixedDeadline,
      attachments: deadlineForm.attachments,
      type: deadlineForm.type || DEADLINE_TYPES.REGULAR,
    };

    setSaving(true);
    setSaveError('');
    try {
      if (editingDeadline) await updateDeadline(editingDeadline.id, data);
      else await addDeadline(data);
      if (user?.uid) removeDraft(user.uid, deadlineDraftScope);
      setModalOpen(false);
    } catch (error) { setSaveError(error.message || 'Could not save. Your form has been kept.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (itemToDelete) {
      if (itemToDelete.isExamSchedule) {
        await deleteSchedule(itemToDelete.sourceScheduleId);
      } else {
        await deleteDeadline(itemToDelete.id);
      }
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const handleSync = async () => {
    await syncDeadlines();
    alert('✅ Deadlines synced to Firebase!');
  };

  const loading = deadlinesLoading || subjectsLoading;
  const needsSync = deadlinesEmpty && deadlines.length > 0;

  const deadlineDataState = useContentLoadState({ loading: loading || classroomLoading || schedulesLoading, hasData: allDeadlines.length > 0, error: deadlinesError || subjectsError || classroomError || schedulesError });
  const deadlinesByStatus = useMemo(() => {
  const groups = {
    [DEADLINE_STATUS.UPCOMING]: [],
    [DEADLINE_STATUS.NO_DATE]: [],
    [DEADLINE_STATUS.COMPLETED]: [],
  };
  sortedDeadlines.forEach((d) => {
    // 🔽 Type filter
    if (typeFilter !== 'all') {
      const deadlineType = d.type || DEADLINE_TYPES.REGULAR;
      if (deadlineType !== typeFilter) return;
    }

    const status = getDeadlineStatus(d.dueDate);
    if (status === 'past' || isFinishedByStudent(d)) {
      groups[DEADLINE_STATUS.COMPLETED].push(d);
    } else if (status === 'no-date') {
      groups[DEADLINE_STATUS.NO_DATE].push(d);
    } else {
      groups[DEADLINE_STATUS.UPCOMING].push(d);
    }
  });
  return groups;
 }, [sortedDeadlines, submissions, studentId, isStudent, typeFilter, now]);

  

  return (
    <div className="min-w-0 space-y-5 overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display font-semibold text-2xl">Deadlines & Activities</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {isAdmin
              ? 'Manage dated deadlines and activities without fixed due dates'
              : 'Track deadlines and ongoing activities'}
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto">
          {isAdmin && needsSync && (
            <Button variant="outline" onClick={handleSync}>
              <CloudUpload className="w-4 h-4" /> Sync to Cloud
            </Button>
          )}
          {isAdmin && (
            <Button onClick={handleAddDeadline}>
              <Plus className="w-4 h-4" /> Add Deadline or Activity
            </Button>
          )}
        </div>
      </div>

      {isStudent && (
        <p role={progressError ? 'alert' : 'status'} className={`text-sm ${progressError ? 'text-status-danger' : 'text-text-secondary'}`}>
          {progressError || (progressLoading
            ? 'Loading saved progress...'
            : !online
              ? 'Offline. Reconnect to save progress across devices.'
              : 'Your checklist progress syncs across devices. It does not submit work to Classroom.')}
        </p>
      )}

      {isAdmin && needsSync && (
        <Card className="bg-status-warning/10 border-status-warning/30">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-status-warning shrink-0" />
            <div>
              <p className="text-sm font-medium text-status-warning">Local data not synced to cloud</p>
              <p className="text-xs text-text-secondary">
                Click "Sync to Cloud" to upload your data to Firebase.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Deadline status">
        {Object.keys(STATUS_LABELS).map((statusKey) => (
          <button
            key={statusKey}
            type="button"
            role="tab"
            aria-selected={activeStatusTab === statusKey}
            onClick={() => setActiveStatusTab(statusKey)}
            className={clsx(
              'min-h-11 w-full whitespace-nowrap rounded-xl px-1.5 py-2 text-[11px] font-medium transition sm:px-3 sm:text-sm',
              activeStatusTab === statusKey
                ? 'bg-accent text-white'
                : 'bg-bg-muted text-text-secondary hover:bg-bg-surface'
            )}
          >
            {STATUS_LABELS[statusKey]} ({deadlineDataState === "loading" ? <Skeleton as="span" className="inline-block h-3 w-4 align-middle" /> : deadlineDataState === "error" ? "—" : (deadlinesByStatus[statusKey]?.length || 0)})
          </button>
        ))}
      </div>

      {/* 🔽 Type filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTypeFilter('all')}
          className={clsx(
            'rounded-full border px-3 py-1.5 text-xs font-medium transition',
            typeFilter === 'all'
              ? 'border-accent bg-accent text-white'
              : 'border-border bg-bg-surface text-text-secondary hover:bg-bg-muted'
          )}
        >
          All Types
        </button>
        {DEADLINE_TYPE_OPTIONS.map((option) => {
          const selected = typeFilter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTypeFilter(option.value)}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition',
                selected
                  ? 'border-transparent text-white'
                  : 'border-border bg-bg-surface text-text-secondary hover:bg-bg-muted'
              )}
              style={selected ? { backgroundColor: option.color } : undefined}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: selected ? '#fff' : option.color }}
              />
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        <LoadingContent loading={loading || classroomLoading || schedulesLoading} hasData={allDeadlines.length > 0} error={deadlinesError || subjectsError || classroomError || schedulesError} label="Deadlines" skeleton={<ContentSkeleton kind="deadline" count={4} />}>
        {deadlinesByStatus[activeStatusTab]?.length === 0 ? (
          <Card hoverable={false}>
            <EmptyState
              icon={CalendarClock}
              title={
                activeStatusTab === DEADLINE_STATUS.NO_DATE
                  ? 'No activities without deadlines'
                  : `No ${STATUS_LABELS[activeStatusTab]} deadlines`
              }
              description={
                isAdmin ? `Add your first deadline to get started.` : `Check back later for updates.`
              }
              actionLabel={isAdmin ? 'Add Deadline' : undefined}
              onAction={isAdmin ? handleAddDeadline : undefined}
            />
          </Card>
        ) : (
          deadlinesByStatus[activeStatusTab].map((deadline) => {
            const status = getDeadlineStatus(deadline.dueDate);
            const isPastDeadline = status === 'past';
            const hasNoDate = status === 'no-date';
            const isUrgent = status === 'urgent' || status === 'today';
            const isFinished = isPastDeadline || isFinishedByStudent(deadline);
            const subjectColor =
              getSubjectColorClass(
                subjects.find((s) => s.name === deadline.subjectName)?.color
              );
            const hasSpecialType =
              deadline.type &&
              deadline.type !== DEADLINE_TYPES.REGULAR &&
              !deadline.isExamSchedule;

            return (
              <div
                key={deadline.id}
                onClick={() => navigate(`/deadlines/${deadline.id}`)}
                className={clsx(
                  'p-4 rounded-xl border transition-all cursor-pointer hover:shadow-card-hover',
                  isPastDeadline
                    ? 'bg-bg-muted/50 border-border opacity-60'
                    : isUrgent
                    ? 'bg-status-danger/5 border-status-danger/30'
                    : 'bg-bg-surface border-border hover:shadow-card-hover'
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        className={clsx(
                          'inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white',
                          subjectColor
                        )}
                      >
                        {deadline.subjectName || 'No Subject'}
                      </span>
                      {deadline.isClassroom && (
                        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                          Google Classroom
                        </span>
                      )}
                      {deadline.isExamSchedule && (
                        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                          Exam Schedule
                        </span>
                      )}

                      {/* 🔽 Type badge (Laboratory / Quiz / Final Project) */}
                      {hasSpecialType && (
                        <span
                          className={clsx(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                            TYPE_BADGE_CLASSES[deadline.type]
                          )}
                        >
                          {getDeadlineTypeLabel(deadline.type)}
                        </span>
                      )}

                      <span
                        className={clsx(
                          'text-xs font-medium',
                          isPastDeadline
                            ? 'text-text-secondary'
                            : isUrgent
                            ? 'text-status-danger'
                            : 'text-accent'
                        )}
                      >
                        {hasNoDate ? 'No fixed deadline' : formatDateDisplay(deadline.dueDate)}
                        {!hasNoDate && isToday(new Date(deadline.dueDate)) && ' • Today'}
                        {isPastDeadline && ' • Past Due'}
                      </span>
                    </div>
                    <p
                      className={clsx(
                        'font-bold text-base mt-1 leading-tight',
                        isPastDeadline ? 'text-text-secondary' : 'text-text-primary'
                      )}
                    >
                      {deadline.title}
                    </p>
                    {deadline.isExamSchedule && (
                      <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-text-secondary">
                        <span>
                          {formatTimeTo12Hour(deadline.startTime)} -{' '}
                          {formatTimeTo12Hour(deadline.endTime)}
                        </span>
                        <span>•</span>
                        <span>
                          {deadline.type === 'online'
                            ? 'Online'
                            : deadline.room || 'Room not specified'}
                        </span>
                      </p>
                    )}
                    <RichTextContent
                      html={deadline.description}
                      className="mt-1 text-sm text-text-secondary"
                    />
                    {deadline.attachments && deadline.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {deadline.attachments.map((file, index) => (
                          <a
                            key={`${file.url}-${index}`}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-surface px-2.5 py-1.5 text-xs font-medium text-accent transition hover:bg-accent-soft"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="max-w-56 truncate">
                              {file.name || `Attachment ${index + 1}`}
                            </span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    )}
                    {deadline.isClassroom && deadline.alternateLink && (
                      <a
                        href={deadline.alternateLink}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                      >
                        Open content
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  {isAdmin && !deadline.isClassroom && (
                    <div className="flex items-center gap-1 self-end sm:shrink-0 sm:self-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (deadline.isExamSchedule) {
                            navigate(
                              `/schedule?view=exams&examType=${encodeURIComponent(
                                deadline.examType.toLowerCase()
                              )}&edit=${encodeURIComponent(deadline.sourceScheduleId)}`
                            );
                          } else {
                            handleEditDeadline(deadline);
                          }
                        }}
                        className="grid h-10 w-10 place-items-center rounded-xl text-text-secondary hover:bg-bg-muted"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemToDelete(deadline);
                          setDeleteModalOpen(true);
                        }}
                        className="grid h-10 w-10 place-items-center rounded-xl text-status-danger hover:bg-bg-muted"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {isStudent && (
                    <button
                      type="button"
                      disabled={isPastDeadline || !studentId || progressLoading || !online || savingIds[deadline.id]}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleDeadlineFinished(deadline);
                      }}
                      className={clsx(
                        'rounded-xl px-3 py-2 text-xs font-medium transition self-end sm:shrink-0 sm:self-auto disabled:opacity-60 disabled:cursor-not-allowed',
                        isFinished
                          ? isPastDeadline
                            ? 'cursor-default bg-status-success/10 text-status-success'
                            : 'bg-status-success/10 text-status-success hover:bg-status-success/20'
                          : 'bg-accent text-white hover:bg-accent/90'
                      )}
                    >
                      {savingIds[deadline.id] ? 'Saving...' : isFinished ? 'Finished' : 'Not Finished'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </LoadingContent>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { if (!saving) setModalOpen(false); }}
        title={editingDeadline ? 'Edit Deadline or Activity' : 'Add Deadline or Activity'}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <DraftControls scope={deadlineDraftScope} value={deadlineForm} onRestore={setDeadlineForm} />
          {saveError && <p role="alert" className="text-red-500 text-sm">{saveError}</p>}
          {saving && <p role="status" className="text-sm">Waiting for server confirmation. Do not submit again.</p>}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Subject
            </label>
            <select
              value={deadlineForm.subjectName}
              onChange={(e) => setDeadlineForm({ ...deadlineForm, subjectName: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
              {subjects.length === 0 && (
                <option value="">No subjects. Add one in the Subjects page.</option>
              )}
            </select>
          </div>

          {/* 🔽 NEW: Type dropdown */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Type
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DEADLINE_TYPE_OPTIONS.map((option) => {
                const selected = deadlineForm.type === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDeadlineForm({ ...deadlineForm, type: option.value })}
                    className={clsx(
                      'flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-medium transition',
                      selected
                        ? 'border-accent bg-accent-soft text-accent shadow-sm'
                        : 'border-border bg-bg-muted text-text-secondary hover:bg-bg-surface'
                    )}
                    aria-pressed={selected}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                    <span className="min-w-0 truncate">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Title
            </label>
            <input
              type="text"
              value={deadlineForm.title}
              onChange={(e) => setDeadlineForm({ ...deadlineForm, title: e.target.value })}
              placeholder="e.g., Final Project Submission"
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Description
            </label>
            <RichTextEditor
              value={deadlineForm.description}
              onChange={(description) =>
                setDeadlineForm((current) => ({ ...current, description }))
              }
              placeholder="Instructions, reminders, links, or other details..."
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-bg-muted px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={deadlineForm.noFixedDeadline}
              onChange={(e) =>
                setDeadlineForm({
                  ...deadlineForm,
                  noFixedDeadline: e.target.checked,
                  dueDate: e.target.checked ? '' : deadlineForm.dueDate,
                })
              }
              className="h-4 w-4 accent-accent"
            />
            This activity has no fixed deadline
          </label>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Date
            </label>
            <input
              type="date"
              disabled={deadlineForm.noFixedDeadline}
              value={deadlineForm.dueDate}
              onChange={(e) => setDeadlineForm({ ...deadlineForm, dueDate: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className={deadlineForm.noFixedDeadline ? 'pointer-events-none opacity-50' : ''}>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">Time</label>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 sm:grid-cols-[1fr_auto_1fr_1fr] sm:gap-3">
              <div className="min-w-0">
                <label className="text-xs text-text-secondary block mb-1">Hour</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={deadlineForm.hour}
                  onChange={(e) => setDeadlineForm({ ...deadlineForm, hour: e.target.value })}
                  placeholder="1-12"
                  className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent text-center"
                />
              </div>
              <span className="text-lg font-bold text-text-secondary">:</span>
              <div className="min-w-0">
                <label className="text-xs text-text-secondary block mb-1">Minute</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={deadlineForm.minute}
                  onChange={(e) => setDeadlineForm({ ...deadlineForm, minute: e.target.value })}
                  placeholder="0-59"
                  className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent text-center"
                />
              </div>
              <div className="col-span-3 min-w-0 sm:col-span-1">
                <label className="text-xs text-text-secondary block mb-1">AM/PM</label>
                <select
                  value={deadlineForm.ampm}
                  onChange={(e) => setDeadlineForm({ ...deadlineForm, ampm: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Enter hour (1-12), minute (0-59), and select AM/PM
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Attachments (Links)
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                type="text"
                value={attachmentName}
                onChange={(e) => setAttachmentName(e.target.value)}
                placeholder="File name"
                className="min-w-0 w-full px-3 py-2 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
              />
              <input
                type="url"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="URL"
                className="min-w-0 w-full px-3 py-2 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
              />
              <Button size="sm" onClick={addAttachment}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {deadlineForm.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {deadlineForm.attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-bg-muted rounded-lg px-3 py-2 text-sm"
                  >
                    <span className="truncate">{file.name}</span>
                    <div className="flex items-center gap-2">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="text-status-danger hover:bg-bg-surface rounded p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-border bg-bg-surface px-4 pb-1 pt-3 sm:static sm:mx-0 sm:flex-row sm:justify-end sm:px-0">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!online || saving} onClick={handleSaveDeadline}>
              {editingDeadline ? 'Save Changes' : 'Add Deadline'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Deadline"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete <strong>{itemToDelete?.title}</strong>?
            <br />
            <span className="text-status-danger font-medium">
              This action cannot be undone.
            </span>
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
