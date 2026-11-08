import { LoadingContent, DetailSkeleton } from "../components/ui/Skeleton";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  FileText, 
  ExternalLink,
  User,
  BookOpen,
  MapPin
} from 'lucide-react';
import { format, differenceInDays, isToday } from 'date-fns';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import RichTextContent from '../components/ui/RichTextContent';
import { useAuth } from '../context/AuthContext';
import { useDeadlinesStore } from '../store/useDeadlinesStore';
import { useSubjectsStore } from '../store/useSubjectsStore';
import { useSubmissionsStore } from '../store/useSubmissionsStore';
import { useClassroomContentsStore } from '../store/useClassroomContentsStore';
import { buildClassroomDeadlines } from '../utils/classroomDeadlines';
import { useScheduleStore } from '../store/useScheduleStore';
import useDeadlineClock from '../hooks/useDeadlineClock';
import { useConnection } from '../offline/status';

function clsx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function formatTime12(time24) {
  if (!time24) return 'Time not specified';
  const [hourValue, minute = '00'] = String(time24).split(':');
  const hour = Number(hourValue);
  if (Number.isNaN(hour)) return String(time24);
  const period = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${minute} ${period}`;
}

const PROGRESS_OPTIONS = [
  { value: null, label: '⚪ Inactive', color: 'text-text-secondary', border: 'border-text-secondary' },
  { value: 'in_progress', label: '⏳ In Progress', color: 'text-status-warning', border: 'border-status-warning' },
  { value: 'completed', label: '✅ Completed', color: 'text-status-success', border: 'border-status-success' },
];

export default function DeadlineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { deadlines, getDeadlineById, load: loadDeadlines, loading: deadlinesLoading, firebaseError: deadlinesError } = useDeadlinesStore();
  const { subjects, load: loadSubjects, loading: subjectsLoading, firebaseError: subjectsError } = useSubjectsStore();
  const { contents: classroomContents, load: loadClassroomContents, loading: classroomLoading, error: classroomError } = useClassroomContentsStore();
  const { schedules, load: loadSchedules, loading: schedulesLoading, firebaseError: schedulesError } = useScheduleStore();
  const { getStatus, saveSubmission, loadStudentSubmissions, loading: progressLoading, errorMessage: progressError, savingIds = {} } = useSubmissionsStore();
  const online = useConnection(state => state.online);

  const [deadline, setDeadline] = useState(() => getDeadlineById(id) || null);
  const [loading, setLoading] = useState(true);
  const now = useDeadlineClock(deadline ? [deadline] : []);

  const sourceError = deadlinesError || subjectsError || schedulesError || classroomError;
  const sourcePending = deadlinesLoading || subjectsLoading || schedulesLoading || classroomLoading;

  const studentId = user?.studentId || '';
  const isStudent = user?.role === 'student' || user?.isGuest;
  const submissionStatus = getStatus(studentId, id);

  useEffect(() => {
    if (isStudent) return loadStudentSubmissions(studentId);
  }, [isStudent, studentId, loadStudentSubmissions]);

  useEffect(() => {
    const unsubDeadlines = loadDeadlines();
    const unsubSubjects = loadSubjects();
    const unsubSchedules = loadSchedules();
    loadClassroomContents();
    return () => {
      unsubDeadlines?.();
      unsubSubjects?.();
      unsubSchedules?.();
    };
  }, [loadDeadlines, loadSubjects, loadSchedules, loadClassroomContents]);

  useEffect(() => {
    const examDeadline = schedules
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
        startTime: schedule.startTime || '',
        endTime: schedule.endTime || '',
        room: schedule.room || '',
        type: schedule.type || 'f2f',
        attachments: Array.isArray(schedule.attachments) ? schedule.attachments : [],
      }))
      .find((item) => item.id === id);

    const found = getDeadlineById(id) ||
      buildClassroomDeadlines(classroomContents, subjects).find((item) => item.id === id) ||
      examDeadline;
    if (found) {
      setDeadline(found);
    }
    if (!found) setDeadline(null);
    setLoading(!found && sourcePending && !sourceError);
  }, [id, deadlines, getDeadlineById, classroomContents, subjects, schedules, sourcePending, sourceError]);

  const goBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
    } else {
      navigate('/deadlines', { replace: true });
    }
  };

  const cycleProgress = async () => {
    if (!isStudent || !studentId) return;
    const currentIndex = PROGRESS_OPTIONS.findIndex(p => p.value === submissionStatus);
    const nextIndex = (currentIndex + 1) % PROGRESS_OPTIONS.length;
    const nextStatus = PROGRESS_OPTIONS[nextIndex].value;
    try {
      await saveSubmission(studentId, id, nextStatus);
    } catch {
      // The progress error below reports the failure; confirmed status stays visible.
    }
  };

  if (loading && !deadline && !sourceError) return <LoadingContent loading label="Deadline details" skeleton={<DetailSkeleton />} />;

  if (!deadline) {
    return (
      <div className="text-center py-16">
        <p className="text-text-secondary">{sourceError ? "Unable to load this deadline. Check your connection and try again." : "Deadline not found"}</p>
        <Button onClick={goBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const hasFixedDeadline = Boolean(deadline.dueDate) && !deadline.noFixedDeadline;
  const dueDate = hasFixedDeadline ? new Date(deadline.dueDate) : null;
  const isPastDeadline = dueDate ? dueDate.getTime() < now.getTime() : false;
  const isTodayDeadline = dueDate ? isToday(dueDate) : false;
  const daysLeft = dueDate ? differenceInDays(dueDate, now) : null;

  const subject = subjects.find(s => s.name === deadline.subjectName);

  const handleSubjectClick = () => {
    navigate(`/subjects/${subject.id}`);
  };

  const getDaysText = () => {
    if (!hasFixedDeadline) return 'No fixed deadline';
    if (isPastDeadline) return 'Past due';
    if (isTodayDeadline) return 'Due Today';
    if (daysLeft === 1) return '1 day left';
    return `${daysLeft} days left`;
  };

  const getCurrentProgress = () => {
    const found = PROGRESS_OPTIONS.find(p => p.value === submissionStatus);
    return found || PROGRESS_OPTIONS[0];
  };

  const currentProgress = getCurrentProgress();

  // Format date: Aug 11, 2026
  const formattedDate = dueDate ? format(dueDate, 'MMM d, yyyy') : '';
  // Format time: 11:59pm (lowercase)
  const formattedTime = dueDate ? format(dueDate, 'h:mm a').toLowerCase() : '';

  return (
    <div className="space-y-5">
      {isStudent && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={cycleProgress}
            disabled={!studentId || progressLoading || !online || savingIds[id]}
            className={`rounded-xl border px-3 py-2 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed ${currentProgress.color} ${currentProgress.border}`}>
            {savingIds[id] ? 'Saving...' : progressLoading ? 'Loading progress...' : currentProgress.label}
          </button>
          <p role={progressError ? 'alert' : 'status'} className={`text-sm ${progressError ? 'text-status-danger' : 'text-text-secondary'}`}>
            {progressError || (!online
              ? 'Offline. Reconnect to save progress across devices.'
              : 'Personal checklist only. This does not submit work to Classroom.')}
          </p>
        </div>
      )}
      {sourceError && <p role="alert" className="rounded-xl border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">Some deadline information could not be refreshed. Available details remain visible.</p>}
      <button
        type="button"
        onClick={goBack}
        aria-label="Back to deadlines"
        className="flex items-center text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      <Card className="border-t-4 border-t-accent">
        {/* Tight wrapper – no gaps */}
        <div className="space-y-0">
          {/* Row 1: Title + Progress | Countdown + Date + Time */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-wrap flex-1">
              <h1 className="font-display font-bold text-2xl mb-0">{deadline.title}</h1>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className={clsx(
                'text-sm font-medium',
                isPastDeadline ? 'text-status-danger' : 'text-accent'
              )}>
                {getDaysText()}
              </p>
              {formattedDate && <div className="text-sm text-text-secondary leading-tight">{formattedDate}</div>}
              {formattedTime && <div className="text-sm text-text-secondary leading-tight">{formattedTime}</div>}
            </div>
          </div>

          {/* Row 2: Subject + Instructor – directly below, no gap */}
          <div className="flex items-center gap-3 flex-wrap mt-0">
            {subject ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSubjectClick}
                  className="flex items-center gap-1.5 text-sm text-accent hover:underline font-medium"
                >
                  <BookOpen className="w-4 h-4" />
                  {subject.name}
                </button>
                {subject.instructor && (
                  <>
                    <span className="text-text-secondary text-sm">•</span>
                    <span className="text-sm text-text-secondary flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {subject.instructor}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <span className="text-sm text-text-secondary">
                <BookOpen className="w-4 h-4 inline mr-1" />
                {deadline.subjectName || 'No Subject'}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2">
            📝 Description
          </h3>
          <div className="bg-bg-muted rounded-xl p-4">
            {deadline.description ? (
              <RichTextContent html={deadline.description} className="text-text-primary" />
            ) : (
              <p className="text-text-secondary">No description provided.</p>
            )}
          </div>
        </div>

        {deadline.isExamSchedule && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-bg-muted p-4 text-sm text-text-secondary">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              {formatTime12(deadline.startTime)} - {formatTime12(deadline.endTime)}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent" />
              {deadline.type === 'online' ? 'Online' : deadline.room || 'Room not specified'}
            </span>
          </div>
        )}

        {/* Attachments */}
        {deadline.attachments && deadline.attachments.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2">
              📎 Attachments ({deadline.attachments.length})
            </h3>
            <div className="space-y-2">
              {deadline.attachments.map((file, index) => (
                <a
                  key={index}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-bg-muted hover:bg-bg-muted/70 rounded-xl p-3 transition-colors"
                >
                  <FileText className="w-5 h-5 text-accent shrink-0" />
                  <span className="text-sm font-medium text-text-primary flex-1">{file.name}</span>
                  <ExternalLink className="w-4 h-4 text-text-secondary shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}
        {deadline.isClassroom && deadline.alternateLink && (
          <a
            href={deadline.alternateLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90"
          >
            Open in Google Classroom
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </Card>
    </div>
  );
}

