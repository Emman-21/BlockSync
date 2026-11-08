import useContentLoadState from "../hooks/useContentLoadState";
import { LoadingContent, ScheduleSkeleton, Skeleton } from "../components/ui/Skeleton";
import DraftControls from '../offline/DraftControls';
import { removeDraft } from '../offline/device';
import { useConnection } from '../offline/status';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  Clock,
  ExternalLink,
  FileText,
  GraduationCap,
  MapPin,
  Monitor,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import RichTextEditor from '../components/ui/RichTextEditor';
import RichTextContent from '../components/ui/RichTextContent';
import { useAuth } from '../context/AuthContext';
import { useScheduleStore } from '../store/useScheduleStore';
import { useSubjectsStore } from '../store/useSubjectsStore';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const EXAM_TYPES = ['Prelims', 'Midterms', 'Finals'];

function normalizeTime(time) {
  if (!time) return null;
  const value = String(time).trim().toUpperCase();

  if (value.includes('AM') || value.includes('PM')) {
    const [timePart, period] = value.split(' ');
    let [hour, minute] = timePart.split(':').map(Number);
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  const parts = value.split(':');
  if (parts.length === 3) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }

  return value;
}

const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 7; hour <= 20; hour += 1) {
    for (let minute = 0; minute < 60; minute += 30) {
      const period = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      slots.push({
        value: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        label: `${hour12}:${String(minute).padStart(2, '0')} ${period}`,
      });
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();
const SLOT_INDEX_MAP = Object.fromEntries(
  TIME_SLOTS.map((slot, index) => [slot.value, index])
);

function clsx(...classes) {
  return classes.filter(Boolean).join(' ');
}

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

function getScheduleDraftScope(itemId, isExamView, examType, subjectName, subjects) {
  const subject = subjects.find((item) => item.name === subjectName);
  return `schedules:${itemId || 'new'}:${isExamView ? examType : 'class'}:${subject?.semesterId || 'general'}:${subject?.id || subjectName || 'general'}`;
}

function formatTime12(time24) {
  if (!time24) return '';
  const [hour, minute] = time24.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${period}`;
}

function parseLocalDate(dateString) {
  if (!dateString) return null;
  const date = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toLocalDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function getMondayKey(date) {
  const monday = new Date(date);
  const day = monday.getDay();
  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
  return toLocalDateKey(monday);
}

function getExamDateStatus(dateString) {
  const examDate = parseLocalDate(dateString);
  if (!examDate) return { label: 'Date unavailable', tone: 'bg-bg-muted text-text-secondary' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (examDate.getTime() === today.getTime()) {
    return { label: 'Today', tone: 'bg-status-danger/15 text-status-danger' };
  }
  if (examDate.getTime() === tomorrow.getTime()) {
    return { label: 'Tomorrow', tone: 'bg-status-warning/15 text-status-warning' };
  }
  if (examDate < today) {
    return { label: 'Completed', tone: 'bg-bg-muted text-text-secondary' };
  }
  return { label: 'Upcoming', tone: 'bg-accent-soft text-accent' };
}

export default function Schedules() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, user } = useAuth();
  const {
    schedules,
    load,
    refresh,
    loading,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    firebaseError,
    errorMessage,
    clearError,
  } = useScheduleStore();
  const { subjects, load: loadSubjects } = useSubjectsStore();

  const requestedView = searchParams.get('view');
  const activeView = requestedView === 'exams' ? 'exams' : 'classes';
  const isExamView = activeView === 'exams';
  const requestedExamType = searchParams.get('examType');
  const selectedExamType =
    EXAM_TYPES.find(
      (type) => type.toLowerCase() === requestedExamType?.toLowerCase()
    ) || 'Prelims';

  const scheduleState = useContentLoadState({ loading, hasData: schedules.length > 0, error: firebaseError });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [scheduleDraftScope, setScheduleDraftScope] = useState('');
  const [formData, setFormData] = useState({
    day: 'Monday',
    startTime: '08:00',
    endTime: '09:00',
    subjectName: '',
    examDate: '',
    description: '',
    attachments: [],
    room: '',
    type: 'f2f',
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const online = useConnection(state => state.online);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const requestedEditId = searchParams.get('edit');

  useEffect(() => {
    const unsubscribeSchedules = load();
    const unsubscribeSubjects = loadSubjects();

    return () => {
      unsubscribeSchedules?.();
      unsubscribeSubjects?.();
    };
  }, [load, loadSubjects]);

  const visibleSchedules = useMemo(
    () =>
      schedules
        .filter((schedule) =>
          isExamView
            ? schedule.scheduleKind === 'exam' &&
              (schedule.examType || 'Prelims') === selectedExamType
            : schedule.scheduleKind !== 'exam'
        )
        .map((schedule) => ({
          ...schedule,
          startTime: normalizeTime(schedule.startTime) || schedule.startTime,
          endTime: normalizeTime(schedule.endTime) || schedule.endTime,
        })),
    [schedules, isExamView, selectedExamType]
  );

  const scheduleMap = useMemo(() => {
    const map = {};
    DAYS.forEach((day) => {
      map[day] = {};
      visibleSchedules
        .filter((schedule) => schedule.day === day)
        .forEach((schedule) => {
          map[day][schedule.startTime] = schedule;
        });
    });
    return map;
  }, [visibleSchedules]);

  const spannedMap = useMemo(() => {
    const map = {};

    DAYS.forEach((day) => {
      const spans = new Set();
      visibleSchedules
        .filter((schedule) => schedule.day === day)
        .forEach((schedule) => {
          const startIndex = SLOT_INDEX_MAP[schedule.startTime];
          const endIndex = SLOT_INDEX_MAP[schedule.endTime];

          if (startIndex !== undefined && endIndex !== undefined) {
            for (let index = startIndex + 1; index < endIndex; index += 1) {
              spans.add(index);
            }
          }
        });
      map[day] = spans;
    });

    return map;
  }, [visibleSchedules]);

  const examDateGroups = useMemo(() => {
    if (!isExamView) return [];

    const sorted = [...visibleSchedules].sort((first, second) => {
      const dateComparison = String(first.examDate || '9999-12-31').localeCompare(
        String(second.examDate || '9999-12-31')
      );
      if (dateComparison !== 0) return dateComparison;
      return String(first.startTime || '').localeCompare(String(second.startTime || ''));
    });

    const groups = [];
    sorted.forEach((exam) => {
      const key = exam.examDate || 'date-unavailable';
      const existing = groups.find((group) => group.key === key);
      if (existing) existing.exams.push(exam);
      else groups.push({ key, date: parseLocalDate(exam.examDate), exams: [exam] });
    });

    return groups.map((group, index) => ({
      ...group,
      startsNewWeek:
        index > 0 &&
        group.date &&
        groups[index - 1].date &&
        getMondayKey(group.date) !== getMondayKey(groups[index - 1].date),
    }));
  }, [visibleSchedules, isExamView]);

  const examPeriodLabel = useMemo(() => {
    const dates = examDateGroups.map((group) => group.date).filter(Boolean);
    if (dates.length === 0) return 'Dates will appear after exams are added';

    const first = dates[0];
    const last = dates[dates.length - 1];
    const firstLabel = first.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', weekday: 'long',
    });
    const lastLabel = last.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', weekday: 'long',
    });
    return first.getTime() === last.getTime()
      ? firstLabel
      : `${firstLabel} – ${lastLabel}`;
  }, [examDateGroups]);

  const setView = (view) => {
    setSearchParams(
      view === 'exams'
        ? { view: 'exams', examType: selectedExamType.toLowerCase() }
        : {}
    );
    setFormError('');
  };

  const setExamType = (examType) => {
    setSearchParams({
      view: 'exams',
      examType: examType.toLowerCase(),
    });
    setFormError('');
  };

  const handleAdd = () => {
    clearError();
    setFormError('');
    setEditingItem(null);
    const subjectName = subjects[0]?.name || '';
    setScheduleDraftScope(getScheduleDraftScope(null, isExamView, selectedExamType, subjectName, subjects));
    setFormData({
      day: 'Monday',
      startTime: '08:00',
      endTime: '09:00',
      subjectName,
      examDate: '',
      description: '',
      attachments: [],
      room: '',
      type: 'f2f',
    });
    setModalOpen(true);
    setAttachmentName('');
    setAttachmentUrl('');
  };

  const handleEdit = (item) => {
    clearError();
    setFormError('');
    setEditingItem(item);
    setScheduleDraftScope(getScheduleDraftScope(
      item.id,
      item.scheduleKind === 'exam' || isExamView,
      item.examType || selectedExamType,
      item.subjectName || '',
      subjects
    ));
    setFormData({
      day: item.day || 'Monday',
      startTime: item.startTime || '08:00',
      endTime: item.endTime || '09:00',
      subjectName: item.subjectName || '',
      examDate: item.examDate || '',
      description: item.description || '',
      attachments: Array.isArray(item.attachments) ? item.attachments : [],
      room: item.room || '',
      type: item.type || 'f2f',
    });
    setModalOpen(true);
    setAttachmentName('');
    setAttachmentUrl('');
  };

  const addAttachment = () => {
    const name = attachmentName.trim();
    const url = attachmentUrl.trim();
    if (!name || !url) return;

    setFormData((current) => ({
      ...current,
      attachments: [...current.attachments, { name, url }],
    }));
    setAttachmentName('');
    setAttachmentUrl('');
  };

  const removeAttachment = (indexToRemove) => {
    setFormData((current) => ({
      ...current,
      attachments: current.attachments.filter((_, index) => index !== indexToRemove),
    }));
  };

  useEffect(() => {
    if (!requestedEditId || loading || schedules.length === 0) return;

    const scheduleToEdit = schedules.find(
      (schedule) => schedule.id === requestedEditId && schedule.scheduleKind === 'exam'
    );

    if (!scheduleToEdit) return;

    handleEdit(scheduleToEdit);
    setSearchParams({
      view: 'exams',
      examType: (scheduleToEdit.examType || 'Prelims').toLowerCase(),
    });
  }, [requestedEditId, loading, schedules]);

  const handleSave = async () => {
    if (saving) return;
    if (!formData.subjectName.trim() || !formData.day) {
      setFormError('Please select a day and subject.');
      return;
    }

    if (isExamView && !formData.examDate) {
      setFormError('Please select the examination date.');
      return;
    }

    if (formData.endTime <= formData.startTime) {
      setFormError('End time must be later than start time.');
      return;
    }

    const selectedSubject = subjects.find(
      (subject) => subject.name === formData.subjectName
    );
    const examDay = formData.examDate
      ? new Date(`${formData.examDate}T00:00:00`).toLocaleDateString(
          'en-US',
          { weekday: 'long' }
        )
      : formData.day;

    const data = {
      scheduleKind: isExamView ? 'exam' : 'class',
      day: isExamView ? examDay : formData.day,
      startTime: formData.startTime,
      endTime: formData.endTime,
      subjectName: formData.subjectName.trim(),
      instructor: selectedSubject?.instructor || editingItem?.instructor || '',
      examType: isExamView ? selectedExamType : '',
      examDate: isExamView ? formData.examDate : '',
      description: isExamView ? formData.description.trim() : '',
      attachments: isExamView ? formData.attachments : [],
      room: formData.room.trim(),
      type: formData.type,
    };

    setSaving(true);
    setFormError('');

    try {
      if (editingItem) {
        await updateSchedule(editingItem.id, data);
      } else {
        await addSchedule(data);
      }
      if (user?.uid) removeDraft(user.uid, scheduleDraftScope);
      setModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      setFormError(error?.message || 'Unable to save the schedule.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete || deleting) return;

    setDeleting(true);
    try {
      await deleteSchedule(itemToDelete.id);
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const getSubjectInfo = (subjectName) => {
    const subject = subjects.find((item) => item.name === subjectName);
    return {
      color: getSubjectColorClass(subject?.color),
      id: subject?.id || null,
    };
  };

  const getEntryDetails = (entry) => {
    if (entry.scheduleKind === 'exam') {
      const subject = getSubjectInfo(entry.subjectName);
      return {
        title: entry.subjectName || 'No Subject',
        subtitle: 'Exam',
        color: subject.color,
        subjectId: null,
      };
    }

    const subject = getSubjectInfo(entry.subjectName);
    return {
      title: entry.subjectName || 'No Subject',
      subtitle: '',
      color: subject.color,
      subjectId: subject.id,
    };
  };

  const openDeleteModal = (entry) => {
    setItemToDelete(entry);
    setDeleteModalOpen(true);
  };

  

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            {isExamView ? `${selectedExamType} Exam Schedule` : 'Class Schedule'}
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {isExamView
              ? isAdmin
                ? 'Manage upcoming examination schedules'
                : 'View upcoming examination schedules'
              : isAdmin
                ? 'Manage weekly class schedules'
                : 'View your weekly class schedule'}
          </p>
        </div>

        <div className="flex flex-row gap-2">
          {isAdmin && (
            <>
              <Button
                variant="outline"
                onClick={refresh}
                size="sm"
                className="flex-[1] sm:flex-initial"
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
              <Button onClick={handleAdd} className="flex-[3] sm:flex-initial">
                <Plus className="h-4 w-4" />
                {isExamView ? 'Add Exam' : 'Add Schedule'}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-bg-muted p-1">
        <button
          type="button"
          onClick={() => setView('classes')}
          className={clsx(
            'flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
            !isExamView
              ? 'bg-bg-surface text-accent shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          )}
        >
          <BookOpen className="h-4 w-4" />
          Class Schedule
        </button>
        <button
          type="button"
          onClick={() => setView('exams')}
          className={clsx(
            'flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
            isExamView
              ? 'bg-bg-surface text-accent shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          )}
        >
          <GraduationCap className="h-4 w-4" />
          Exam Schedule
        </button>
      </div>

      {isExamView && (
        <div className="grid grid-cols-3 gap-2">
          {EXAM_TYPES.map((examType) => (
            <button
              key={examType}
              type="button"
              onClick={() => setExamType(examType)}
              className={clsx(
                'min-h-11 rounded-xl border px-3 py-2 text-sm font-medium transition',
                selectedExamType === examType
                  ? 'border-accent bg-accent text-white'
                  : 'border-border bg-bg-surface text-text-secondary hover:border-accent hover:text-accent'
              )}
            >
              {examType}
            </button>
          ))}
        </div>
      )}

      {firebaseError && (
        <Card className="border-status-danger/30 bg-status-danger/10">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-status-danger" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-status-danger">
                Firestore connection error
              </p>
              <p className="text-xs text-text-secondary">
                {errorMessage || 'Unable to load or update schedules.'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={refresh}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-3 text-sm text-text-secondary">
        <CalendarDays className="h-4 w-4" />
        <span>
          {scheduleState === "loading" ? <Skeleton as="span" className="inline-block h-3 w-4 align-middle" /> : scheduleState === "error" ? "—" : visibleSchedules.length}{' '}
          {isExamView
            ? visibleSchedules.length === 1
              ? 'exam scheduled'
              : 'exams scheduled'
            : visibleSchedules.length === 1
              ? 'class scheduled'
              : 'classes scheduled'}
        </span>
      </div>

      <LoadingContent loading={loading} hasData={schedules.length > 0} error={firebaseError} label="Schedules" errorFallback={null} skeleton={<ScheduleSkeleton days={DAYS} rows={TIME_SLOTS.length} exams={isExamView} />}>
        {visibleSchedules.length === 0 ? (
        <Card hoverable={false}>
          <EmptyState
            icon={isExamView ? GraduationCap : CalendarDays}
            title={isExamView ? 'No exams scheduled' : 'No classes scheduled'}
            description={
              isAdmin
                ? isExamView
                  ? `Add the upcoming ${selectedExamType.toLowerCase()} examination schedule.`
                  : 'Add your first class schedule.'
                : isExamView
                  ? 'No upcoming exams have been added yet.'
                  : 'No classes have been added yet.'
            }
            actionLabel={
              isAdmin ? (isExamView ? 'Add Exam' : 'Add Schedule') : undefined
            }
            onAction={isAdmin ? handleAdd : undefined}
          />
        </Card>
      ) : isExamView ? (
        <div className="space-y-4">
          <Card className="border-accent/25 bg-accent-soft/30">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  {selectedExamType} examination period
                </p>
                <h2 className="mt-1 font-display text-lg font-semibold text-text-primary">
                  {examPeriodLabel}
                </h2>
              </div>
              <span className="w-fit rounded-full bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary">
                {visibleSchedules.length} {visibleSchedules.length === 1 ? 'exam' : 'exams'}
              </span>
            </div>
          </Card>

          {examDateGroups.map((group) => {
            const status = getExamDateStatus(group.key);
            const dateHeading = group.date
              ? group.date.toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                })
              : 'Date unavailable';

            return (
              <section key={group.key} className="space-y-2">
                {group.startsNewWeek && (
                  <div className="flex items-center gap-3 py-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
                    <span className="h-px flex-1 bg-border" />
                    New calendar week
                    <span className="h-px flex-1 bg-border" />
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <h2 className="font-display text-base font-semibold text-text-primary">
                    {dateHeading}
                  </h2>
                  <span className={clsx('rounded-full px-2.5 py-1 text-xs font-medium', status.tone)}>
                    {status.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {group.exams.map((entry) => {
                    const details = getEntryDetails(entry);

                    return (
                      <article
                        key={entry.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/deadlines/exam-schedule-${entry.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/deadlines/exam-schedule-${entry.id}`);
                          }
                        }}
                        className="cursor-pointer overflow-hidden rounded-2xl border border-border bg-bg-surface shadow-card transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card-hover"
                      >
                        <div className={clsx('h-1.5', details.color)} />
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="break-words font-semibold text-text-primary">
                                {details.title}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {formatTime12(entry.startTime)} – {formatTime12(entry.endTime)}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  {entry.type === 'online' ? (
                                    <Monitor className="h-3.5 w-3.5" />
                                  ) : (
                                    <MapPin className="h-3.5 w-3.5" />
                                  )}
                                  {entry.type === 'online' ? 'Online' : entry.room || 'F2F'}
                                </span>
                              </div>
                            </div>

                            {isAdmin && (
                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleEdit(entry);
                                  }}
                                  className="rounded-lg p-2 text-text-secondary hover:bg-bg-muted hover:text-accent"
                                  aria-label={`Edit ${details.title}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openDeleteModal(entry);
                                  }}
                                  className="rounded-lg p-2 text-text-secondary hover:bg-status-danger/10 hover:text-status-danger"
                                  aria-label={`Delete ${details.title}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>

                          <RichTextContent
                            html={entry.description}
                            className="mt-3 text-sm text-text-secondary"
                          />

                          {entry.attachments?.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {entry.attachments.map((file, index) => (
                                <a
                                  key={`${file.url}-${index}`}
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-bg-muted px-2.5 py-1.5 text-xs font-medium text-accent hover:underline"
                                >
                                  <FileText className="h-3.5 w-3.5 shrink-0" />
                                  <span className="max-w-56 truncate">{file.name || `Attachment ${index + 1}`}</span>
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {DAYS.map((day) => {
              const entries = visibleSchedules
                .filter((entry) => entry.day === day)
                .sort((first, second) =>
                  first.startTime.localeCompare(second.startTime)
                );

              return (
                <section
                  key={day}
                  className="rounded-xl border border-border bg-bg-surface p-3"
                >
                  <h2 className="mb-2 font-display text-sm font-semibold">{day}</h2>

                  {entries.length === 0 ? (
                    <p className="text-xs text-text-secondary">
                      {isExamView ? 'No exams scheduled' : 'No classes scheduled'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {entries.map((entry) => {
                        const details = getEntryDetails(entry);

                        return (
                          <div
                            key={entry.id}
                            className={clsx(
                              'rounded-lg p-3 text-white',
                              details.color,
                              details.subjectId && 'cursor-pointer'
                            )}
                            onClick={() => {
                              if (isExamView) {
                                navigate(`/deadlines/exam-schedule-${entry.id}`);
                              } else if (details.subjectId) {
                                navigate(`/subjects/${details.subjectId}`);
                              }
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                {details.subtitle && (
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/75">
                                    {details.subtitle}
                                  </p>
                                )}
                                <p className="break-words text-sm font-medium">
                                  {details.title}
                                </p>
                              </div>

                              {isAdmin && (
                                <div className="flex shrink-0 items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleEdit(entry);
                                    }}
                                    className="rounded p-1 text-white/80 hover:bg-white/20"
                                    aria-label={`Edit ${details.title}`}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openDeleteModal(entry);
                                    }}
                                    className="rounded p-1 text-white/80 hover:bg-white/20"
                                    aria-label={`Delete ${details.title}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/80">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime12(entry.startTime)} –{' '}
                                {formatTime12(entry.endTime)}
                              </span>
                              <span className="flex items-center gap-1">
                                {entry.type === 'online' ? (
                                  <Monitor className="h-3 w-3" />
                                ) : (
                                  <MapPin className="h-3 w-3" />
                                )}
                                {entry.type === 'online'
                                  ? 'Online'
                                  : entry.room || 'F2F'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full table-fixed border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 w-24 border-b border-border bg-bg-surface p-2 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Time
                  </th>
                  {DAYS.map((day) => (
                    <th
                      key={day}
                      className="border-b border-border py-2 text-center text-xs font-semibold uppercase tracking-wider text-text-primary"
                    >
                      {day.slice(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((slot, rowIndex) => (
                  <tr key={slot.value} className="h-9 align-middle">
                    <td className="sticky left-0 z-10 h-9 w-24 border-t border-border/60 bg-bg-surface p-0 align-top text-[11px] text-text-secondary">
                      <div className="flex h-full items-start justify-end pr-3 pt-1">
                        <span className="leading-none">{slot.label}</span>
                      </div>
                    </td>

                    {DAYS.map((day) => {
                      const entry = scheduleMap[day]?.[slot.value];

                      if (!entry) {
                        if (spannedMap[day]?.has(rowIndex)) return null;
                        return (
                          <td
                            key={`${day}-${slot.value}`}
                            className="border-t border-border/60 p-1"
                          />
                        );
                      }

                      const startIndex = SLOT_INDEX_MAP[entry.startTime];
                      const endIndex = SLOT_INDEX_MAP[entry.endTime];
                      const rowSpan =
                        startIndex !== undefined && endIndex !== undefined
                          ? Math.max(1, endIndex - startIndex)
                          : 1;
                      const details = getEntryDetails(entry);

                      return (
                        <td
                          key={`${day}-${entry.id}`}
                          rowSpan={rowSpan}
                          className="border-t border-border/60 p-0.5 align-middle"
                          style={{ height: `${rowSpan * 36}px` }}
                        >
                          <div
                            onClick={() => {
                              if (isExamView) {
                                navigate(`/deadlines/exam-schedule-${entry.id}`);
                              } else if (details.subjectId) {
                                navigate(`/subjects/${details.subjectId}`);
                              }
                            }}
                            className={clsx(
                              'flex h-full flex-col justify-center rounded-lg p-1.5 text-[11px] text-white transition-all hover:shadow-md',
                              details.color,
                              isExamView || details.subjectId ? 'cursor-pointer' : 'cursor-default'
                            )}
                          >
                            {details.subtitle && (
                              <p className="truncate text-[9px] font-semibold uppercase leading-tight text-white/70">
                                {details.subtitle}
                              </p>
                            )}
                            <p className="truncate font-medium leading-tight">
                              {details.title}
                            </p>
                            <p className="mt-0.5 truncate text-[10px] leading-tight text-white/80">
                              {formatTime12(entry.startTime)} –{' '}
                              {formatTime12(entry.endTime)}
                            </p>
                            <div className="mt-0.5 flex items-center gap-1 text-[10px] leading-tight text-white/70">
                              {entry.type === 'online' ? (
                                <Monitor className="h-3 w-3" />
                              ) : (
                                <MapPin className="h-3 w-3" />
                              )}
                              <span className="truncate">
                                {entry.type === 'online'
                                  ? 'Online'
                                  : entry.room || 'F2F'}
                              </span>
                            </div>

                            {isAdmin && (
                              <div className="mt-1 flex items-center gap-1 border-t border-white/20 pt-1">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleEdit(entry);
                                  }}
                                  className="rounded p-0.5 text-white/80 hover:bg-white/20"
                                  aria-label={`Edit ${details.title}`}
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openDeleteModal(entry);
                                  }}
                                  className="rounded p-0.5 text-white/80 hover:bg-white/20"
                                  aria-label={`Delete ${details.title}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      </LoadingContent>

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={
          editingItem
            ? isExamView
              ? 'Edit Exam Schedule'
              : 'Edit Class Schedule'
            : isExamView
              ? 'Add Exam Schedule'
              : 'Add Class Schedule'
        }
        maxWidth="max-w-md"
      >
        <div className="max-h-[70vh] space-y-4 overflow-y-auto">
          <DraftControls scope={scheduleDraftScope} value={formData} onRestore={setFormData} />
          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {isExamView ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Examination Date
              </label>
              <input
                type="date"
                value={formData.examDate}
                onChange={(event) =>
                  setFormData({ ...formData, examDate: event.target.value })
                }
                className="w-full rounded-xl bg-bg-muted px-3 py-2.5 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
              />
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Day
              </label>
              <select
                value={formData.day}
                onChange={(event) =>
                  setFormData({ ...formData, day: event.target.value })
                }
                className="w-full rounded-xl bg-bg-muted px-3 py-2.5 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
              >
                {DAYS.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Start Time
              </label>
              <select
                value={formData.startTime}
                onChange={(event) =>
                  setFormData({ ...formData, startTime: event.target.value })
                }
                className="w-full rounded-xl bg-bg-muted px-3 py-2.5 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                End Time
              </label>
              <select
                value={formData.endTime}
                onChange={(event) =>
                  setFormData({ ...formData, endTime: event.target.value })
                }
                className="w-full rounded-xl bg-bg-muted px-3 py-2.5 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Subject
            </label>
            <select
              value={formData.subjectName}
              onChange={(event) =>
                setFormData({ ...formData, subjectName: event.target.value })
              }
              className="w-full rounded-xl bg-bg-muted px-3 py-2.5 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.name}>
                  {subject.name}
                </option>
              ))}
              {subjects.length === 0 && (
                <option value="">No subjects available.</option>
              )}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Room (optional)
            </label>
            <input
              type="text"
              value={formData.room}
              onChange={(event) =>
                setFormData({ ...formData, room: event.target.value })
              }
              placeholder="e.g., Room 301"
              className="w-full rounded-xl bg-bg-muted px-3 py-2.5 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>

          {isExamView && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Description (optional)
              </label>
              <RichTextEditor
                value={formData.description}
                onChange={(description) =>
                  setFormData((current) => ({ ...current, description }))
                }
                placeholder="Instructions or reminders for the examination"
                minHeight="min-h-32"
              />
            </div>
          )}

          {isExamView && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Attachments (Links)
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  type="text"
                  value={attachmentName}
                  onChange={(event) => setAttachmentName(event.target.value)}
                  placeholder="File name"
                  className="min-w-0 w-full rounded-xl bg-bg-muted px-3 py-2 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
                />
                <input
                  type="url"
                  value={attachmentUrl}
                  onChange={(event) => setAttachmentUrl(event.target.value)}
                  placeholder="File or Drive URL"
                  className="min-w-0 w-full rounded-xl bg-bg-muted px-3 py-2 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
                />
                <Button size="sm" type="button" onClick={addAttachment} disabled={!attachmentName.trim() || !attachmentUrl.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {formData.attachments.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {formData.attachments.map((file, index) => (
                    <div key={`${file.url}-${index}`} className="flex items-center gap-2 rounded-lg bg-bg-muted px-3 py-2 text-sm">
                      <FileText className="h-4 w-4 shrink-0 text-accent" />
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 flex-1 truncate text-accent hover:underline"
                      >
                        {file.name}
                      </a>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="rounded p-1 text-status-danger transition hover:bg-bg-surface"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(event) =>
                setFormData({ ...formData, type: event.target.value })
              }
              className="w-full rounded-xl bg-bg-muted px-3 py-2.5 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            >
              <option value="f2f">Face-to-Face</option>
              <option value="online">Online</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-2">
            <Button
              variant="ghost"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!online || saving || subjects.length === 0}
            >
              {saving
                ? 'Saving...'
                : editingItem
                  ? 'Save Changes'
                  : isExamView
                    ? 'Add Exam'
                    : 'Add Schedule'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteModalOpen}
        onClose={() => !deleting && setDeleteModalOpen(false)}
        title={isExamView ? 'Delete Exam Schedule' : 'Delete Class Schedule'}
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete{' '}
            <strong>
              {itemToDelete?.subjectName}
            </strong>
            ?
            <br />
            <span className="font-medium text-status-danger">
              This action cannot be undone.
            </span>
          </p>

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
