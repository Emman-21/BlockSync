import { LoadingContent, ContentSkeleton, ScheduleSkeleton, DetailSkeleton } from "../components/ui/Skeleton";
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Pencil, 
  Trash2, 
  Plus, 
  ExternalLink,
  Calendar,
  User,
  BookOpen,
  Link2,
  Clock,
  GraduationCap,
  MapPin,
  Monitor,
  GripVertical,
  AlertCircle,
  FileText
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import RichTextEditor from '../components/ui/RichTextEditor';
import RichTextContent from '../components/ui/RichTextContent';
import { useAuth } from '../context/AuthContext';
import { useSubjectsStore } from '../store/useSubjectsStore';
import { useDeadlinesStore } from '../store/useDeadlinesStore';
import { useScheduleStore } from '../store/useScheduleStore';
import SubjectClassroomContent from '../components/subjects/SubjectClassroomContent';
import { useClassroomContentsStore } from '../store/useClassroomContentsStore';
import { format, isToday, differenceInDays } from 'date-fns';
import { buildClassroomDeadlines } from '../utils/classroomDeadlines';
import useDeadlineClock from '../hooks/useDeadlineClock';
import {
  DEADLINE_TYPES,
  DEADLINE_TYPE_OPTIONS,
} from '../utils/deadlineTypes';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS = [
  '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM',
  '7:00 PM', '7:30 PM', '8:00 PM'
];

function clsx(...classes) {
  return classes.filter(Boolean).join(' ');
}

const getDeadlineAttachments = (content) => {
  const items = [
    ...(Array.isArray(content.attachments) ? content.attachments : []),
    ...(Array.isArray(content.materials) ? content.materials : []),
  ];

  return items
    .map((item, index) => {
      const driveFile = item?.driveFile?.driveFile || item?.driveFile;
      const url =
        driveFile?.alternateLink ||
        item?.link?.url ||
        item?.form?.formUrl ||
        item?.youtubeVideo?.alternateLink ||
        item?.url;

      if (!url) return null;

      return {
        url,
        name:
          driveFile?.title ||
          item?.link?.title ||
          item?.form?.title ||
          item?.youtubeVideo?.title ||
          item?.name ||
          item?.title ||
          `Attachment ${index + 1}`,
      };
    })
    .filter(Boolean);
};

const getResourceType = (url = '') => {
  const value = url.toLowerCase();

  if (value.includes('meet.google.com')) return 'meet';
  if (value.includes('classroom.google.com')) return 'classroom';
  return 'link';
};

const RESOURCE_LOGO_OPTIONS = [
  { value: 'netacad', label: 'Cisco NetAcad' },
  { value: 'classroom', label: 'Google Classroom' },
  { value: 'meet', label: 'Google Meet' },
  { value: 'drive', label: 'Google Drive' },
  { value: 'workspace', label: 'Google Workspace' },
];

function ResourceIcon({ type, logoType }) {
  const selectedType = logoType || type || 'netacad';

  if (selectedType === 'meet') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
        <path fill="#fbbc04" d="M4 6.5A2.5 2.5 0 0 1 6.5 4H13a3 3 0 0 1 3 3v1.2l3.3-2.1A1.7 1.7 0 0 1 22 7.5v9a1.7 1.7 0 0 1-2.7 1.4L16 15.8V17a3 3 0 0 1-3 3H6.5A2.5 2.5 0 0 1 4 17.5z" />
        <path fill="#fbbc04" d="M2 8.5A2.5 2.5 0 0 1 4.5 6H6v12H4.5A2.5 2.5 0 0 1 2 15.5z" />
      </svg>
    );
  }

  if (selectedType === 'classroom') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
        <path fill="#34a853" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H17a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6.5A2.5 2.5 0 0 1 4 18.5z" />
        <path fill="#fff" d="M7 7h3.5a2.5 2.5 0 0 1 2.5 2.5V18a2.5 2.5 0 0 0-2.5-2H7zm10 0h-3.5a2.5 2.5 0 0 0-2.5 2.5V18a2.5 2.5 0 0 1 2.5-2H17z" />
      </svg>
    );
  }

  if (selectedType === 'drive') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 shrink-0">
        <path fill="#0F9D58" d="M7.71 3.5h4.58L20 16.86h-4.58L7.71 3.5z" />
        <path fill="#4285F4" d="M4.58 16.86H20l-2.08 3.64H2.5l2.08-3.64z" />
        <path fill="#F4B400" d="M7.71 3.5 2.5 12.54l2.08 3.64 5.21-9.04L7.71 3.5z" />
      </svg>
    );
  }

  if (selectedType === 'workspace') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 shrink-0">
        <path fill="#4285F4" d="M12 2 15 7h-3.5L9.75 4z" />
        <path fill="#34A853" d="m15 7 3 5-3 5h-3.5l3-5-3-5z" />
        <path fill="#FBBC04" d="m9 7 3 5-3 5H3.5l3-5-3-5z" />
        <path fill="#EA4335" d="M9 17h6l-3 5H6z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 24" aria-hidden="true" className="h-5 w-5 shrink-0">
      <g fill="#049fd9">
        <rect x="1" y="12" width="2" height="9" rx="1" />
        <rect x="5" y="9" width="2" height="12" rx="1" />
        <rect x="9" y="6" width="2" height="15" rx="1" />
        <rect x="13" y="3" width="2" height="18" rx="1" />
        <rect x="17" y="1" width="2" height="20" rx="1" />
        <rect x="21" y="3" width="2" height="18" rx="1" />
        <rect x="25" y="6" width="2" height="15" rx="1" />
        <rect x="29" y="9" width="2" height="12" rx="1" />
      </g>
    </svg>
  );
}

const normalizeSubject = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

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

const getSubjectColorClass = (color = '') => {
  const value = String(color || '').trim();
  if (!value) return 'bg-slate-500';
  if (value.startsWith('bg-')) return value;
  return LEGACY_SUBJECT_COLOR_MAP[value] || 'bg-slate-500';
};

const subjectCode = (value) =>
  normalizeSubject(value).match(/[a-z]+\s*\d+/)?.[0]?.replace(/\s+/g, '');

const normalizeSubjectRecord = (subject) => ({
  ...subject,
  links: Array.isArray(subject?.links) ? subject.links.filter(Boolean) : [],
  syllabusItems: Array.isArray(subject?.syllabusItems)
    ? subject.syllabusItems
        .map((item) => ({
          title: String(item?.title || '').trim(),
          percentage: Number(item?.percentage) || 0,
        }))
        .filter((item) => item.title || item.percentage > 0)
    : [],
});

const formatTimeTo12Hour = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

const convertTo24Hour = (time12, ampm) => {
  if (!time12) return '00:00';
  let [hours, minutes] = time12.split(':').map(Number);
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export default function SubjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { subjects, updateSubject, deleteSubject, load: loadSubjects, loading: subjectsLoading, firebaseError: subjectError, errorMessage: subjectErrorMessage } = useSubjectsStore();
  const { deadlines, addDeadline, load: loadDeadlines, loading: deadlinesLoading, firebaseError: deadlinesError } = useDeadlinesStore();
  const { schedules, addSchedule, updateSchedule, deleteSchedule, load: loadSchedules, loading: schedulesLoading, firebaseError: schedulesError } = useScheduleStore();
  const { contents: classroomContents, load: loadClassroomContents, loading: classroomLoading, error: classroomError } = useClassroomContentsStore();

  const [subject, setSubject] = useState(() => { const found = subjects.find(item => item.id === id); return found ? normalizeSubjectRecord(found) : null; });
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    units: 3,
    instructor: '',
    googleClassroomCode: ''
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Deadline modal
  const [deadlineModalOpen, setDeadlineModalOpen] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(null);
  const [deadlineForm, setDeadlineForm] = useState({
    subjectName: '',
    title: '',
    description: '',
    dueDate: '',
    hour: '12',
    minute: '00',
    ampm: 'PM',
    noFixedDeadline: false,
    type: DEADLINE_TYPES.REGULAR,
  });
  
  // Schedule modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingScheduleIndex, setEditingScheduleIndex] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    day: 'Monday',
    startTime: '08:00',
    endTime: '09:00',
    startTime12: '8:00',
    endTime12: '9:00',
    startAmPm: 'AM',
    endAmPm: 'AM',
    type: 'online',
    room: ''
  });

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editingLinkIndex, setEditingLinkIndex] = useState(null);
  const [linkForm, setLinkForm] = useState({
    label: '',
    url: '',
    logoType: 'netacad'
  });

  const [syllabusFormOpen, setSyllabusFormOpen] = useState(false);
  const [syllabusForm, setSyllabusForm] = useState({
    title: '',
    percentage: '20',
  });

  // Drag-and-drop state for links
  const [draggedLinkIndex, setDraggedLinkIndex] = useState(null);
  const [dragOverLinkIndex, setDragOverLinkIndex] = useState(null);

  // Load data on mount
  useEffect(() => {
    const unsub1 = loadSubjects();
    const unsub2 = loadDeadlines();
    const unsub3 = loadSchedules();
    loadClassroomContents();
    return () => {
      if (unsub1) unsub1();
      if (unsub2) unsub2();
      if (unsub3) unsub3();
    };
  }, [loadSubjects, loadDeadlines, loadSchedules, loadClassroomContents]);

  useEffect(() => {
    const found = subjects.find(s => s.id === id);
    if (found) {
      setSubject(normalizeSubjectRecord(found));
      setEditForm({
        name: found.name || '',
        units: found.units || 3,
        instructor: found.instructor || '',
        googleClassroomCode: found.googleClassroomCode || ''
      });
    } else {
      setSubject(null);
    }
    setLoading(!found && subjectsLoading && !subjectError);
  }, [id, subjects]);

  const getDeadlineStatus = (date) => {
    if (!date) return 'no-date';
    const dueDate = new Date(date);
    if (dueDate.getTime() < now.getTime()) return 'past';
    if (isToday(dueDate)) return 'today';
    const days = differenceInDays(dueDate, now);
    if (days <= 3) return 'urgent';
    return 'upcoming';
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return 'No fixed deadline';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'No fixed deadline';
    return format(date, 'MMM d, yyyy • h:mm a');
  };

  const classroomSubjectDeadlines = useMemo(() =>
    buildClassroomDeadlines(classroomContents, subjects).filter((deadline) =>
      normalizeSubject(deadline.subjectName) === normalizeSubject(subject?.name)
    ), [classroomContents, subjects, subject?.name]);

  const examScheduleDeadlines = useMemo(() => schedules
    .filter((schedule) =>
      schedule.scheduleKind === 'exam' &&
      schedule.examDate &&
      normalizeSubject(schedule.subjectName) === normalizeSubject(subject?.name)
    )
    .map((schedule) => ({
      id: `exam-schedule-${schedule.id}`,
      sourceScheduleId: schedule.id,
      isExamSchedule: true,
      subjectName: schedule.subjectName,
      examType: schedule.examType || 'Prelims',
      title: `${schedule.examType || 'Exam'} Examination`,
      description: schedule.description || '',
      dueDate: `${schedule.examDate}T${schedule.startTime || '00:00'}:00`,
      examDate: schedule.examDate,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      room: schedule.room || '',
      type: schedule.type || 'f2f',
      attachments: Array.isArray(schedule.attachments) ? schedule.attachments : [],
    })), [schedules, subject?.name]);

  const subjectDeadlines = [
    ...examScheduleDeadlines,
    ...classroomSubjectDeadlines,
    ...deadlines.filter(d => normalizeSubject(d.subjectName) === normalizeSubject(subject?.name)),
  ];
  const now = useDeadlineClock(subjectDeadlines);
  const sortedDeadlines = [...subjectDeadlines].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  const subjectSchedules = schedules.filter(s =>
    s.scheduleKind !== 'exam' &&
    s.subjectName?.toLowerCase().trim() === subject?.name?.toLowerCase().trim()
  );

  const isDuplicateDay = (day, excludeIndex) => {
    const currentSchedule = subjectSchedules;
    for (let i = 0; i < currentSchedule.length; i++) {
      if (i === excludeIndex) continue;
      if (currentSchedule[i].day === day) {
        return true;
      }
    }
    return false;
  };

  // Deadline handlers
  const handleAddDeadline = () => {
    setEditingDeadline(null);
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    
    setDeadlineForm({
      subjectName: subject.name,
      title: '',
      description: '',
      dueDate: format(now, 'yyyy-MM-dd'),
      hour: String(hour12),
      minute: String(minutes).padStart(2, '0'),
      ampm: ampm,
      noFixedDeadline: false,
      type: DEADLINE_TYPES.REGULAR,
    });
    setDeadlineModalOpen(true);
  };

  const handleSaveDeadline = () => {
    if (
      !deadlineForm.title.trim() ||
      (!deadlineForm.noFixedDeadline && !deadlineForm.dueDate)
    ) return;
    
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
    if (dueDateTime) dueDateTime.setHours(hour24, minute, 0, 0);
    
    const data = {
      subjectName: deadlineForm.subjectName,
      title: deadlineForm.title.trim(),
      description: deadlineForm.description,
      dueDate: dueDateTime?.toISOString() || null,
      noFixedDeadline: deadlineForm.noFixedDeadline,
      type: deadlineForm.type || DEADLINE_TYPES.REGULAR,
    };
    
    addDeadline(data);
    setDeadlineModalOpen(false);
  };

  // Schedule handlers
  const handleAddSchedule = () => {
    setEditingScheduleIndex(null);
    setScheduleForm({
      day: 'Monday',
      startTime: '08:00',
      endTime: '09:00',
      startTime12: '8:00',
      endTime12: '9:00',
      startAmPm: 'AM',
      endAmPm: 'AM',
      type: 'online',
      room: ''
    });
    setScheduleModalOpen(true);
  };

  const handleEditSchedule = (index) => {
    setEditingScheduleIndex(index);
    const s = subjectSchedules[index];
    const startParts = s.startTime.split(':');
    const endParts = s.endTime.split(':');
    const startHour = parseInt(startParts[0]);
    const endHour = parseInt(endParts[0]);
    const startAmPm = startHour >= 12 ? 'PM' : 'AM';
    const endAmPm = endHour >= 12 ? 'PM' : 'AM';
    const startHour12 = startHour % 12 || 12;
    const endHour12 = endHour % 12 || 12;
    
    setScheduleForm({
      day: s.day,
      startTime: s.startTime,
      endTime: s.endTime,
      startTime12: `${startHour12}:${startParts[1]}`,
      endTime12: `${endHour12}:${endParts[1]}`,
      startAmPm: startAmPm,
      endAmPm: endAmPm,
      type: s.type || 'online',
      room: s.room || ''
    });
    setScheduleModalOpen(true);
  };

  const handleSaveSchedule = () => {
    const isDuplicate = isDuplicateDay(scheduleForm.day, editingScheduleIndex);
    if (isDuplicate) {
      alert(`⚠️ Schedule for "${scheduleForm.day}" already exists. Please choose a different day or edit the existing one.`);
      return;
    }

    const startTime24 = convertTo24Hour(scheduleForm.startTime12, scheduleForm.startAmPm);
    const endTime24 = convertTo24Hour(scheduleForm.endTime12, scheduleForm.endAmPm);

    const data = {
      subjectName: subject.name,
      day: scheduleForm.day,
      startTime: startTime24,
      endTime: endTime24,
      type: scheduleForm.type,
      room: scheduleForm.room || '',
    };

    if (editingScheduleIndex !== null) {
      const existingSchedule = subjectSchedules[editingScheduleIndex];
      if (existingSchedule) {
        updateSchedule(existingSchedule.id, data);
      }
    } else {
      addSchedule(data);
    }
    setScheduleModalOpen(false);
  };

  const handleDeleteSchedule = (index) => {
    const schedule = subjectSchedules[index];
    if (schedule) {
      deleteSchedule(schedule.id);
    }
  };

  // 🔗 Links handlers with validation
  const handleAddLink = () => {
    setEditingLinkIndex(null);
    setLinkForm({ label: '', url: '', logoType: 'netacad' });
    setLinkModalOpen(true);
  };

  const handleEditLink = (index) => {
    setEditingLinkIndex(index);
    setLinkForm({
      ...subject.links[index],
      logoType: subject.links[index].logoType || 'netacad',
    });
    setLinkModalOpen(true);
  };

  const handleSaveLink = () => {
    // ✅ Validation: both label and URL are required
    const label = linkForm.label.trim();
    const url = linkForm.url.trim();
    if (!label || !url) {
      alert('⚠️ Please enter both a Label and a URL.');
      return;
    }
    const logoType = RESOURCE_LOGO_OPTIONS.some(
      (option) => option.value === linkForm.logoType
    )
      ? linkForm.logoType
      : 'netacad';
    const updatedLinks = [...(subject.links || [])];
    if (editingLinkIndex !== null) {
      updatedLinks[editingLinkIndex] = { label, url, logoType };
    } else {
      updatedLinks.push({ label, url, logoType });
    }
    handleFieldUpdate('links', updatedLinks);
    setLinkModalOpen(false);
  };

  const handleDeleteLink = (index) => {
    const updatedLinks = subject.links.filter((_, i) => i !== index);
    handleFieldUpdate('links', updatedLinks);
  };

  // Drag-and-drop for links
  const handleDragStart = (e, index) => {
    setDraggedLinkIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedLinkIndex !== null && draggedLinkIndex !== index) {
      setDragOverLinkIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverLinkIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedLinkIndex === null || draggedLinkIndex === dropIndex) {
      setDraggedLinkIndex(null);
      setDragOverLinkIndex(null);
      return;
    }
    const currentLinks = [...(subject.links || [])];
    const [draggedItem] = currentLinks.splice(draggedLinkIndex, 1);
    currentLinks.splice(dropIndex, 0, draggedItem);
    handleFieldUpdate('links', currentLinks);
    setDraggedLinkIndex(null);
    setDragOverLinkIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedLinkIndex(null);
    setDragOverLinkIndex(null);
  };

  // Helper to update subject fields
  const handleFieldUpdate = (field, value) => {
    const updated = { ...subject, [field]: value };
    setSubject(updated);
    updateSubject(subject.id, { [field]: value });
  };

  const handleSaveSyllabusItem = () => {
    const title = String(syllabusForm.title || '').trim();
    const percentage = Number(syllabusForm.percentage);

    if (!title) {
      alert('⚠️ Please enter a syllabus category title.');
      return;
    }

    if (!Number.isFinite(percentage) || percentage <= 0) {
      alert('⚠️ Please enter a valid percentage greater than 0.');
      return;
    }

    const items = [...(subject.syllabusItems || [])];
    items.push({ title, percentage });
    handleFieldUpdate('syllabusItems', items);
    setSyllabusForm({ title: '', percentage: '20' });
    setSyllabusFormOpen(false);
  };

  const handleDeleteSyllabusItem = (index) => {
    const items = (subject.syllabusItems || []).filter((_, itemIndex) => itemIndex !== index);
    handleFieldUpdate('syllabusItems', items);
  };

  // Edit subject save
  const handleEditSubjectSave = () => {
    const updatedData = {
      name: editForm.name,
      units: editForm.units,
      instructor: editForm.instructor,
      googleClassroomCode: editForm.googleClassroomCode
    };
    const updatedSubject = { ...subject, ...updatedData };
    setSubject(updatedSubject);
    updateSubject(subject.id, updatedData);
    setEditModalOpen(false);
  };

  const handleDeleteSubject = () => {
    deleteSubject(subject.id);
    navigate('/subjects');
  };

  const goBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
    } else {
      navigate('/subjects', { replace: true });
    }
  };

  if (loading && !subject && !subjectError) return <LoadingContent loading label="Subject details" skeleton={<DetailSkeleton />} />;

  if (!subject) {
    return (
      <div className="text-center py-16">
        <p className="text-text-secondary">{subjectError ? subjectErrorMessage || "Unable to load this subject." : "Subject not found"}</p>
        <Button onClick={goBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {subjectError && <p role="alert" className="rounded-xl border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">Unable to refresh this subject. Available details remain visible.</p>}
      <div className="flex items-center gap-3">
        <button
          onClick={goBack}
          className="p-2 rounded-lg hover:bg-bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display font-semibold text-2xl">Subject Details</h1>
      </div>

      {/* Main Subject Card */}
      <Card className={clsx(
        'text-white',
        getSubjectColorClass(subject.color)
      )}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display font-bold text-2xl">{subject.name}</h2>
            {subject.instructor && (
              <p className="text-white/80 text-sm mt-1 flex items-center gap-2">
                <User className="w-4 h-4" /> {subject.instructor}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    setEditForm({
                      name: subject.name || '',
                      units: subject.units || 3,
                      instructor: subject.instructor || '',
                      googleClassroomCode: subject.googleClassroomCode || ''
                    });
                    setEditModalOpen(true);
                  }}
                  className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"
                  title="Edit Subject"
                >
                  <Pencil className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setDeleteModalOpen(true)}
                  className="p-2 rounded-lg hover:bg-red-500/30 text-white transition-colors"
                  title="Delete Subject"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-white/90 text-sm">
          <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full">
            <GraduationCap className="w-4 h-4" />
            Units: {subject.units || 0}
          </div>
          {subject.googleClassroomCode && (
            <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full">
              <BookOpen className="w-4 h-4" />
              Google Classroom: {subject.googleClassroomCode}
            </div>
          )}
        </div>
      </Card>

      {/* Schedule Section */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent" />
            Schedule
          </h3>
          {isAdmin && (
            <Button size="sm" onClick={handleAddSchedule}>
              <Plus className="w-4 h-4" /> Add Schedule
            </Button>
          )}
        </div>

        <LoadingContent key={id} loading={schedulesLoading} hasData={subjectSchedules.length > 0} error={schedulesError} label="Subject schedule" skeleton={<ScheduleSkeleton days={DAYS} rows={TIME_SLOTS.length} />}>
{subjectSchedules.length === 0 ? (
          <p className="text-text-secondary text-sm">No schedule set.</p>
        ) : (
          <div className="space-y-2">
            {subjectSchedules.map((s, index) => (
              <div key={index} className="flex items-center justify-between bg-bg-muted rounded-lg p-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-medium text-sm">{s.day}</span>
                  <span className="text-sm text-text-secondary flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTimeTo12Hour(s.startTime)} - {formatTimeTo12Hour(s.endTime)}
                  </span>
                  <span className={clsx(
                    'text-xs px-2 py-0.5 rounded-full',
                    s.type === 'online' ? 'bg-blue-500/20 text-blue-500' : 'bg-green-500/20 text-green-500'
                  )}>
                    {s.type === 'online' ? '🖥️ ONLINE' : `📍 ${s.room || 'F2F'}`}
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditSchedule(index)}
                      className="p-1 rounded hover:bg-bg-surface text-text-secondary"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSchedule(index)}
                      className="p-1 rounded hover:bg-bg-surface text-status-danger"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
</LoadingContent>
      </Card>

      {/* Syllabus Section */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent" />
            Syllabus
          </h3>
          {isAdmin && (
            <Button size="sm" onClick={() => setSyllabusFormOpen((open) => !open)}>
              <Plus className="w-4 h-4" /> {syllabusFormOpen ? 'Close' : 'Add Item'}
            </Button>
          )}
        </div>

        {syllabusFormOpen && isAdmin && (
          <div className="mb-4 space-y-3 rounded-xl border border-border bg-bg-muted p-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Category title</label>
              <input
                type="text"
                value={syllabusForm.title}
                onChange={(e) => setSyllabusForm((current) => ({ ...current, title: e.target.value }))}
                placeholder="Example: Quizzes"
                className="w-full rounded-xl bg-bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Weight (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={syllabusForm.percentage}
                onChange={(e) => setSyllabusForm((current) => ({ ...current, percentage: e.target.value }))}
                placeholder="20"
                className="w-full rounded-xl bg-bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSyllabusFormOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveSyllabusItem}>Save Item</Button>
            </div>
          </div>
        )}

        {(!subject.syllabusItems || subject.syllabusItems.length === 0) ? (
          <p className="text-sm text-text-secondary">No syllabus categories added yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subject.syllabusItems.map((item, index) => (
              <div key={`${item.title}-${index}`} className="flex items-center justify-between gap-1.5 rounded-lg border border-border bg-bg-muted px-2.5 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium leading-4 text-text-primary">{item.title}</p>
                  <p className="text-base font-semibold leading-5 text-accent">{Number(item.percentage) || 0}%</p>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSyllabusItem(index)}
                    className="rounded-md p-1 text-status-danger transition hover:bg-red-500/10"
                    title="Remove syllabus item"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 🔽 COMPACT Resources & Links with drag-and-drop */}
      <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display font-semibold text-base flex items-center gap-2">
            <Link2 className="w-4 h-4 text-accent" />
            Resources & Links
          </h3>
          {isAdmin && (
            <Button size="sm" onClick={handleAddLink}>
              <Plus className="w-4 h-4" /> Add Link
            </Button>
          )}
        </div>

        {!subject.links || subject.links.length === 0 ? (
          <p className="text-xs text-text-secondary">No links added.</p>
        ) : (
          <div className="space-y-1.5">
            {subject.links.map((link, index) => (
              <div
                key={index}
                draggable={isAdmin}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={clsx(
                  'flex items-center gap-3 rounded-xl border border-border bg-bg-muted px-3 py-2.5 text-sm transition-colors',
                  isAdmin && 'cursor-grab hover:bg-bg-muted/70',
                  draggedLinkIndex === index && 'opacity-50',
                  dragOverLinkIndex === index && draggedLinkIndex !== null && 'border-2 border-accent border-dashed'
                )}
              >
                {isAdmin && (
                  <GripVertical className="w-3.5 h-3.5 text-text-secondary cursor-grab shrink-0" />
                )}
                <ResourceIcon
                  type={getResourceType(link.url)}
                  logoType={link.logoType}
                />
                <span className="min-w-0 flex-1 truncate font-medium text-text-primary">
                  {link.label}
                </span>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-full border border-border bg-bg-surface px-4 py-1.5 text-xs font-medium text-accent transition hover:bg-accent-soft"
                >
                  {(link.logoType || getResourceType(link.url)) === 'meet' ? 'Join' : 'Open'}
                </a>
                {isAdmin && (
                  <div className="flex items-center gap-0.5 shrink-0 border-l border-border pl-2">
                    <button
                      onClick={() => handleEditLink(index)}
                      className="p-0.5 rounded hover:bg-bg-surface text-text-secondary"
                      title="Edit resource"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteLink(index)}
                      className="p-0.5 rounded hover:bg-bg-surface text-status-danger"
                      title="Delete resource"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <SubjectClassroomContent
        subjectName={subject.name}
      />

      {/* Subject Deadlines */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            Subject Deadlines
          </h3>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button size="sm" onClick={handleAddDeadline}>
                <Plus className="w-4 h-4" /> Add Deadline
              </Button>
            )}
            <span className="text-xs text-text-secondary">
              {sortedDeadlines.length} deadlines
            </span>
          </div>
        </div>

        <LoadingContent key={id} loading={deadlinesLoading || classroomLoading || schedulesLoading} hasData={sortedDeadlines.length > 0} error={deadlinesError || classroomError || schedulesError} label="Subject deadlines" skeleton={<ContentSkeleton kind="deadline" count={3} />}>
{sortedDeadlines.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-secondary text-sm">No deadlines for this subject.</p>
            {isAdmin && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleAddDeadline} 
                className="mt-3"
              >
                <Plus className="w-4 h-4" /> Add your first deadline
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedDeadlines.map((deadline) => {
              const status = getDeadlineStatus(deadline.dueDate);
              const isPastDeadline = status === 'past';
              const isUrgent = status === 'urgent' || status === 'today';

              return (
                <div
                  key={deadline.id}
                  onClick={() => navigate(`/deadlines/${deadline.id}`)}
                  className={clsx(
                    'p-3 rounded-lg border transition-all',
                    deadline.isExamSchedule
                      ? 'cursor-pointer hover:shadow-card-hover'
                      : 'cursor-pointer hover:shadow-card-hover',
                    isPastDeadline
                      ? 'bg-bg-muted/50 border-border opacity-60'
                      : isUrgent
                        ? 'bg-status-danger/5 border-status-danger/30'
                        : 'bg-bg-surface border-border'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className={clsx(
                        'font-bold text-base leading-tight',
                        isPastDeadline ? 'text-text-secondary' : 'text-text-primary'
                      )}>
                        {deadline.title}
                      </p>
                      {deadline.isClassroom && (
                        <span className="mt-1 inline-flex rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                          Google Classroom activity
                        </span>
                      )}
                      <p className={clsx(
                        'text-xs',
                        isPastDeadline ? 'text-text-secondary' : isUrgent ? 'text-status-danger' : 'text-text-secondary'
                      )}>
                        {deadline.isExamSchedule ? (
                          <>
                            {format(new Date(`${deadline.examDate}T00:00:00`), 'MMM d, yyyy')}
                            {' • '}{formatTimeTo12Hour(deadline.startTime)} - {formatTimeTo12Hour(deadline.endTime)}
                            {' • '}{deadline.type === 'online' ? 'Online' : deadline.room || 'Room not specified'}
                          </>
                        ) : formatDateDisplay(deadline.dueDate)}
                        {isPastDeadline && ' • Past'}
                      </p>
                      <RichTextContent
                        html={deadline.description}
                        className="mt-1 line-clamp-2 text-xs text-text-secondary"
                      />
                      {deadline.attachments?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {deadline.attachments.map((file, index) => (
                            <a
                              key={`${file.url}-${index}`}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-bg-surface px-2.5 py-1.5 text-xs font-medium text-accent transition hover:bg-accent-soft"
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0" />
                              <span className="max-w-56 truncate">
                                {file.name || `Attachment ${index + 1}`}
                              </span>
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
</LoadingContent>
      </Card>

      {/* Edit Subject Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Subject"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Subject Name
            </label>
            <input
              type="text"
              value={editForm.name || ''}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Units
            </label>
            <input
              type="number"
              min="0"
              max="9"
              value={editForm.units ?? 3}
              onChange={(e) => setEditForm({ ...editForm, units: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Instructor
            </label>
            <input
              type="text"
              value={editForm.instructor || ''}
              onChange={(e) => setEditForm({ ...editForm, instructor: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Google Classroom Code
            </label>
            <input
              type="text"
              value={editForm.googleClassroomCode || ''}
              onChange={(e) => setEditForm({ ...editForm, googleClassroomCode: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSubjectSave}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Deadline Modal */}
      <Modal
        open={deadlineModalOpen}
        onClose={() => setDeadlineModalOpen(false)}
        title="Add Deadline for this Subject"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Subject
            </label>
            <input
              type="text"
              value={deadlineForm.subjectName}
              disabled
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted/50 text-text-secondary text-sm cursor-not-allowed"
            />
          </div>
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
                    onClick={() =>
                      setDeadlineForm({ ...deadlineForm, type: option.value })
                    }
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
              Deadline Title
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
              onChange={(description) => setDeadlineForm((current) => ({
                ...current,
                description,
              }))}
              placeholder="Optional instructions or notes..."
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-bg-muted px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={deadlineForm.noFixedDeadline}
              onChange={(event) => setDeadlineForm({
                ...deadlineForm,
                noFixedDeadline: event.target.checked,
                dueDate: event.target.checked ? '' : deadlineForm.dueDate,
              })}
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
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Time
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
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
              <div className="flex-1">
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
              <div className="flex-1">
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
            <p className="text-xs text-text-secondary mt-1">Enter hour (1-12), minute (0-59), and select AM/PM</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDeadlineModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDeadline}>Add Deadline</Button>
          </div>
        </div>
      </Modal>

      {/* Schedule Modal */}
      <Modal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title={editingScheduleIndex !== null ? 'Edit Schedule' : 'Add Schedule'}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">Day</label>
            <select
              value={scheduleForm.day}
              onChange={(e) => setScheduleForm({ ...scheduleForm, day: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            >
              {DAYS.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">Start Time</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={scheduleForm.startTime12}
                onChange={(e) => setScheduleForm({ ...scheduleForm, startTime12: e.target.value })}
                placeholder="8:00"
                className="flex-1 px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
              />
              <select
                value={scheduleForm.startAmPm}
                onChange={(e) => setScheduleForm({ ...scheduleForm, startAmPm: e.target.value })}
                className="px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">End Time</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={scheduleForm.endTime12}
                onChange={(e) => setScheduleForm({ ...scheduleForm, endTime12: e.target.value })}
                placeholder="9:00"
                className="flex-1 px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
              />
              <select
                value={scheduleForm.endAmPm}
                onChange={(e) => setScheduleForm({ ...scheduleForm, endAmPm: e.target.value })}
                className="px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">Type</label>
            <select
              value={scheduleForm.type}
              onChange={(e) => setScheduleForm({ ...scheduleForm, type: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            >
              <option value="online">Online</option>
              <option value="f2f">Face-to-Face</option>
            </select>
          </div>
          {scheduleForm.type === 'f2f' && (
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1.5 block">Room</label>
              <input
                type="text"
                value={scheduleForm.room || ''}
                onChange={(e) => setScheduleForm({ ...scheduleForm, room: e.target.value })}
                placeholder="e.g., Room 301"
                className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setScheduleModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSchedule}>
              {editingScheduleIndex !== null ? 'Save Changes' : 'Add Schedule'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 🔗 Link Modal with validation and caution alert */}
      <Modal
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        title={editingLinkIndex !== null ? 'Edit Link' : 'Add Link'}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 bg-status-warning/10 border border-status-warning/20 rounded-lg p-3 text-sm text-status-warning">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>Both <strong>Label</strong> and <strong>URL</strong> are required.</p>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Link Label
            </label>
            <input
              type="text"
              value={linkForm.label}
              onChange={(e) => setLinkForm({ ...linkForm, label: e.target.value })}
              placeholder="e.g., Cisco Netacad"
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              URL
            </label>
            <input
              type="url"
              value={linkForm.url}
              onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Choose Logo
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Choose resource logo">
              {RESOURCE_LOGO_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={linkForm.logoType === option.value}
                  onClick={() => setLinkForm({ ...linkForm, logoType: option.value })}
                  className={clsx(
                    'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                    linkForm.logoType === option.value
                      ? 'border-accent bg-accent-soft/20 text-text-primary'
                      : 'border-border bg-bg-muted text-text-secondary hover:bg-bg-muted/70'
                  )}
                >
                  <ResourceIcon type="link" logoType={option.value} />
                  <span className="min-w-0 truncate">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" onClick={() => setLinkModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveLink}>
              {editingLinkIndex !== null ? 'Save Changes' : 'Add Link'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Subject Confirmation */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Subject"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete <strong>{subject.name}</strong>?
            <br />
            <span className="text-status-danger font-medium">This will also remove all associated deadlines and data.</span>
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteSubject}>Delete Subject</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

