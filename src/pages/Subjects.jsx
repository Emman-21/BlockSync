import { LoadingContent, ContentSkeleton } from "../components/ui/Skeleton";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  AlertCircle,
  CalendarClock,
  Calculator
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import GradeCalculator from '../components/subjects/GradeCalculator';
import { useAuth } from '../context/AuthContext';
import { useSubjectsStore } from '../store/useSubjectsStore';
import { subscribeSemesters } from '../services/semesterService';

const SUBJECT_COLORS = [
  { value: 'bg-violet-500', label: 'Violet' },
  { value: 'bg-pink-500', label: 'Pink' },
  { value: 'bg-blue-500', label: 'Blue' },
  { value: 'bg-emerald-500', label: 'Green' },
  { value: 'bg-red-500', label: 'Red' },
  { value: 'bg-teal-500', label: 'Teal' },
  { value: 'bg-fuchsia-500', label: 'Fuchsia' },
  { value: 'bg-sky-500', label: 'Sky' },
  { value: 'bg-lime-500', label: 'Lime' },
  { value: 'bg-amber-500', label: 'Amber' },
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

function clsx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Subjects() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { 
    subjects, 
    load, 
    loading,
    addSubject,
    updateSubject,
    deleteSubject,
    firebaseError,
    errorMessage,
    clearError,
  } = useSubjectsStore();

  const [semesters, setSemesters] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    color: SUBJECT_COLORS[0].value,
    units: 3,
    instructor: '',
    googleClassroomCode: '',
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [calculatorModalOpen, setCalculatorModalOpen] = useState(false);
  const [selectedCalculatorSubjectId, setSelectedCalculatorSubjectId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const unsub = load();
    return () => unsub && unsub();
  }, [load]);

  useEffect(() => {
    const unsubscribe = subscribeSemesters(
      setSemesters,
      () => setSemesters([])
    );
    return () => unsubscribe?.();
  }, []);

  const activeSemester = semesters.find((semester) => semester.status === 'active');

  const subjectsForActiveSemester = (() => {
    if (!activeSemester) return subjects;

    const currentSubjects = subjects.filter(
      (subject) => subject.semesterId === activeSemester.id
    );

    const currentCourseIds = new Set(
      currentSubjects
        .map((subject) => String(subject.classroomCourseId || '').trim())
        .filter(Boolean)
    );
    const currentNames = new Set(
      currentSubjects.map((subject) =>
        String(subject.name || '').trim().toLowerCase().replace(/\s+/g, ' ')
      )
    );

    const unmatchedLegacySubjects = subjects.filter((subject) => {
      if (subject.semesterId) return false;
      const courseId = String(subject.classroomCourseId || '').trim();
      const name = String(subject.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
      return !(courseId && currentCourseIds.has(courseId)) && !currentNames.has(name);
    });

    return [...currentSubjects, ...unmatchedLegacySubjects];
  })();

  const handleAdd = () => {
    clearError();
    setFormError('');
    setEditingSubject(null);
    const usedColors = subjectsForActiveSemester.map((s) => getSubjectColorClass(s.color));
    const availableColor = SUBJECT_COLORS.find((color) => !usedColors.includes(color.value))?.value || SUBJECT_COLORS[0].value;
    setFormData({
      name: '',
      color: availableColor,
      units: 3,
      instructor: '',
      googleClassroomCode: '',
    });
    setModalOpen(true);
  };

  const handleEdit = (subject) => {
    clearError();
    setFormError('');
    setEditingSubject(subject);
    setFormData({
      name: subject.name || '',
      color: getSubjectColorClass(subject.color || SUBJECT_COLORS[0].value),
      units: subject.units || 3,
      instructor: subject.instructor || '',
      googleClassroomCode: subject.googleClassroomCode || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (saving) return;
    if (!formData.name.trim()) {
      setFormError('Subject name is required.');
      return;
    }

    setSaving(true);
    setFormError('');
    const data = {
      name: formData.name.trim(),
      color: formData.color,
      units: formData.units || 3,
      instructor: formData.instructor || '',
      googleClassroomCode: formData.googleClassroomCode || '',
      ...(!editingSubject && activeSemester ? { semesterId: activeSemester.id } : {}),
    };
    try {
      if (editingSubject) {
        await updateSubject(editingSubject.id, data);
      } else {
        await addSubject(data);
      }
      setModalOpen(false);
    } catch (error) {
      setFormError(error?.message || 'Unable to save the subject to Firestore.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!subjectToDelete || deleting) return;
    setDeleting(true);
    setFormError('');

    try {
      await deleteSubject(subjectToDelete.id);
      setDeleteModalOpen(false);
      setSubjectToDelete(null);
    } catch (error) {
      setFormError(error?.message || 'Unable to delete the subject from Firestore.');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenCalculator = () => {
    if (subjectsForActiveSemester.length === 0) return;

    setSelectedCalculatorSubjectId((currentId) => {
      const subjectStillExists = subjectsForActiveSemester.some(
        (subject) => subject.id === currentId
      );

      return subjectStillExists ? currentId : subjectsForActiveSemester[0].id;
    });

    setCalculatorModalOpen(true);
  };

  

  const selectedCalculatorSubject =
    subjectsForActiveSemester.find(
      (subject) => subject.id === selectedCalculatorSubjectId
    ) || subjectsForActiveSemester[0] || null;

  return (
    <div className="min-w-0 space-y-5 overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display font-semibold text-2xl">Subjects</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {activeSemester
              ? `${activeSemester.name} · ${activeSemester.schoolYear}`
              : isAdmin
              ? 'Manage your block subjects'
              : 'View your subjects'}
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Button
            variant="outline"
            onClick={() => navigate('/schedule?view=exams')}
            className="w-full sm:w-auto"
          >
            <CalendarClock className="w-4 h-4" /> Exam Schedule
          </Button>
          <Button
            variant="outline"
            onClick={handleOpenCalculator}
            disabled={subjectsForActiveSemester.length === 0}
            className="w-full sm:w-auto"
          >
            <Calculator className="w-4 h-4" /> Grade Calculator
          </Button>
          {isAdmin && (
            <Button onClick={handleAdd} className="col-span-2 sm:col-span-auto">
              <Plus className="w-4 h-4" /> Add Subject
            </Button>
          )}
        </div>
      </div>

      {firebaseError && (
        <Card className="border-status-danger/30 bg-status-danger/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-status-danger" />
            <div>
              <p className="text-sm font-medium text-status-danger">Unable to connect to Subjects</p>
              <p className="text-xs text-text-secondary">
                {errorMessage || 'Check your internet connection and Firestore permissions, then try again.'}
              </p>
            </div>
          </div>
        </Card>
      )}

      <LoadingContent loading={loading} hasData={subjects.length > 0} error={firebaseError} label="Subjects" errorFallback={null} skeleton={<ContentSkeleton kind="subject" />}>
        {subjectsForActiveSemester.length === 0 ? (
        <Card hoverable={false}>
          <EmptyState
            icon={CalendarClock}
            title="No subjects yet"
            description={isAdmin ? 'Add your first subject to get started.' : 'No subjects added yet.'}
            actionLabel={isAdmin ? 'Add Subject' : undefined}
            onAction={isAdmin ? handleAdd : undefined}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjectsForActiveSemester.map((subject) => (
            <div
              key={subject.id}
              onClick={() => navigate(`/subjects/${subject.id}`)}
              className={clsx(
                'cursor-pointer rounded-xl border border-border p-4 text-white transition-all duration-200 hover:shadow-card-hover sm:hover:-translate-y-1',
                getSubjectColorClass(subject.color)
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{subject.name}</p>
                  {subject.instructor && (
                    <p className="text-xs text-white/80 mt-0.5 line-clamp-1">
                      {subject.instructor}
                    </p>
                  )}
                  {subject.units !== undefined && subject.units !== null && (
                    <p className="text-xs text-white/60 mt-1">
                      {subject.units} {subject.units === 1 ? 'unit' : 'units'}
                    </p>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(subject);
                      }}
                      className="grid h-10 w-10 place-items-center rounded-xl text-white transition-colors hover:bg-white/20"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormError('');
                        setSubjectToDelete(subject);
                        setDeleteModalOpen(true);
                      }}
                      className="grid h-10 w-10 place-items-center rounded-xl text-white transition-colors hover:bg-white/20"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-3 h-0.5 w-full bg-white/20 rounded-full" />
            </div>
          ))}
        </div>
      )}
      </LoadingContent>

      <Modal
        open={calculatorModalOpen}
        onClose={() => setCalculatorModalOpen(false)}
        title="Grade Calculator"
        maxWidth="max-w-6xl"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-accent/20 bg-accent-soft p-3">
            <Calculator className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div>
              <p className="text-sm font-medium text-text-primary">
                Subject Grade Calculator
              </p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">
                Select a subject, then enter your test, quiz, activity, project, and examination scores below.
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Subject
            </label>

            <select
              value={selectedCalculatorSubject?.id || ''}
              onChange={(event) =>
                setSelectedCalculatorSubjectId(event.target.value)
              }
              className="w-full rounded-xl border border-border bg-bg-muted px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            >
              {subjectsForActiveSemester.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl">
            {selectedCalculatorSubject && (
              <GradeCalculator subject={selectedCalculatorSubject} />
            )}
          </div>

          <div className="sticky bottom-0 -mx-4 flex border-t border-border bg-bg-surface px-4 pb-1 pt-3 sm:static sm:mx-0 sm:justify-end sm:px-0">
            <Button
              onClick={() => setCalculatorModalOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingSubject ? 'Edit Subject' : 'Add Subject'}
      >
        <div className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Subject Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Computer Networking 3"
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Color
            </label>
            <select
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            >
              {SUBJECT_COLORS.map((color) => (
                <option key={color.value} value={color.value}>
                  {color.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Units
            </label>
            <input
              type="number"
              min="0"
              max="9"
              value={formData.units}
              onChange={(e) => setFormData({ ...formData, units: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Instructor
            </label>
            <input
              type="text"
              value={formData.instructor}
              onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
              placeholder="e.g., Engr. Juan Dela Cruz"
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Google Classroom Code
            </label>
            <input
              type="text"
              value={formData.googleClassroomCode}
              onChange={(e) => setFormData({ ...formData, googleClassroomCode: e.target.value })}
              placeholder="e.g., abc123"
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>
          <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-border bg-bg-surface px-4 pb-1 pt-3 sm:static sm:mx-0 sm:flex-row sm:justify-end sm:px-0">
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingSubject ? 'Save Changes' : 'Add Subject'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteModalOpen}
        onClose={() => !deleting && setDeleteModalOpen(false)}
        title="Delete Subject"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete <strong>{subjectToDelete?.name}</strong>?
            <br />
            <span className="text-status-danger font-medium">This action cannot be undone.</span>
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
