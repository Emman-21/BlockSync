import useContentLoadState from "../hooks/useContentLoadState";
import { LoadingContent, ContentSkeleton, Skeleton } from "../components/ui/Skeleton";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  LoaderCircle,
  MoreVertical,
  Plus,
  Shield,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import EmptyState from "../components/ui/EmptyState";
import { useAuth } from "../context/AuthContext";
import { useStudentsStore } from "../store/useStudentsStore";
import { removeStudentNumbersFromFirestore } from "../services/studentService";

const emptyForm = {
  name: "",
  gender: "male",
  isAdmin: false,
  isFocalPerson: false,
  isClassRep: false,
};

export default function Students() {
  const { isAdmin } = useAuth();
  const {
    students,
    addStudent,
    updateStudent,
    deleteStudent,
    load,
    loading,
    firebaseError,
    errorMessage,
    seedDefaultStudents,
  } = useStudentsStore();

  const rosterState = useContentLoadState({ loading, hasData: students.length > 0, error: firebaseError });
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [privacyCleaning, setPrivacyCleaning] = useState(false);

  useEffect(() => {
    const unsubscribe = load();
    return typeof unsubscribe === "function" ? unsubscribe : undefined;
  }, [load]);

  const sortedStudents = useMemo(() => {
    return students
      .filter((student) => filter === "all" || student.gender === filter)
      .sort((first, second) => first.name.localeCompare(second.name));
  }, [filter, students]);

  const counts = useMemo(
    () => ({
      all: students.length,
      male: students.filter((student) => student.gender === "male").length,
      female: students.filter((student) => student.gender === "female").length,
    }),
    [students]
  );

  const openAddModal = () => {
    setEditingStudent(null);
    setFormData(emptyForm);
    setModalOpen(true);
    setNotice(null);
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name || "",
      gender: student.gender || "male",
      isAdmin: Boolean(student.isAdmin),
      isFocalPerson: Boolean(student.isFocalPerson),
      isClassRep: Boolean(student.isClassRep),
    });
    setModalOpen(true);
    setNotice(null);
  };

  const handleSave = async () => {
    const name = formData.name.trim();

    if (!name || saving) return;

    setSaving(true);
    setNotice(null);

    const data = {
      ...formData,
      name,
    };

    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, data);
      } else {
        await addStudent(name, formData.gender, data);
      }

      setModalOpen(false);
      setNotice({
        type: "success",
        text: editingStudent
          ? "Student information updated."
          : "Student added to Firestore.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        text: error.message || "Unable to save the student.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!studentToDelete || saving) return;

    setSaving(true);
    setNotice(null);

    try {
      await deleteStudent(studentToDelete.id);
      setDeleteModalOpen(false);
      setStudentToDelete(null);
      setNotice({ type: "success", text: "Student removed." });
    } catch (error) {
      setNotice({
        type: "error",
        text: error.message || "Unable to remove the student.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSeed = async () => {
    try {
      await seedDefaultStudents();
    } catch (error) {
      setNotice({
        type: "error",
        text: error.message || "Unable to add default students.",
      });
    }
  };

  const hasStudentNumbers = students.some(
    (student) =>
      String(
        student.studentNumber || ""
      ).trim()
  );

  const handleRemoveStudentNumbers = async () => {
    if (privacyCleaning) return;

    const confirmed = window.confirm(
      "Remove student numbers from every public Firestore student record? Names and roles will remain unchanged."
    );

    if (!confirmed) return;

    setPrivacyCleaning(true);
    setNotice(null);

    try {
      const result =
        await removeStudentNumbersFromFirestore();

      setNotice({
        type: "success",
        text: `${result.removed} student number field(s) removed from Firestore.`,
      });
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error.message ||
          "Unable to remove student numbers.",
      });
    } finally {
      setPrivacyCleaning(false);
    }
  };

  

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text-primary">
            Students
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {isAdmin
              ? "Manage the shared block roster"
              : <>Total students: {rosterState === "loading" ? <Skeleton as="span" className="inline-block h-3 w-4 align-middle" /> : rosterState === "error" ? "—" : counts.all}</>}
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            {hasStudentNumbers && (
              <Button
                variant="outline"
                onClick={handleRemoveStudentNumbers}
                disabled={privacyCleaning}
                className="justify-center"
              >
                {privacyCleaning ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                Remove Student Numbers
              </Button>
            )}
            <Button onClick={openAddModal} className="justify-center">
              <Plus className="h-4 w-4" />
              Add Student
            </Button>
          </div>
        )}
      </header>

      {notice && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          role={notice.type === "error" ? "alert" : "status"}
          className={`flex items-start gap-2 rounded-2xl border p-4 text-sm ${
            notice.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {notice.text}
        </motion.div>
      )}

      {firebaseError && (
        <Card className="border-rose-500/20 bg-rose-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
            <div>
              <p className="text-sm font-semibold text-text-primary">
                Unable to load the Firestore roster
              </p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">
                {errorMessage ||
                  "Check your connection, Firebase configuration, and Firestore rules."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {isAdmin && !loading && !firebaseError && counts.all === 0 && (
        <Card className="border-accent/20 bg-accent-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">
                No students yet
              </p>
              <p className="text-xs text-text-secondary">
                Add default students to get started.
              </p>
            </div>
            <Button onClick={handleSeed}>
              <Users className="h-4 w-4" />
              Seed Students
            </Button>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          ["all", "All"],
          ["male", "Male"],
          ["female", "Female"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === value
                ? "bg-accent text-white"
                : "bg-bg-muted text-text-secondary hover:bg-bg-surface"
            }`}
          >
            {label} ({rosterState === "loading" ? <Skeleton as="span" className="inline-block h-3 w-4 align-middle" /> : rosterState === "error" ? "—" : counts[value]})
          </button>
        ))}
      </div>

      <LoadingContent loading={loading} hasData={students.length > 0} error={firebaseError} label="Students" errorFallback={null} skeleton={<ContentSkeleton kind="student" />}>
        {sortedStudents.length === 0 ? (
        <Card hoverable={false}>
          <EmptyState
            icon={Users}
            title={filter === "all" ? "No students yet" : `No ${filter} students`}
            description="Student records will appear here."
            actionLabel={isAdmin && filter === "all" ? "Add first student" : undefined}
            onAction={isAdmin ? openAddModal : undefined}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sortedStudents.map((student) => (
            <Card key={student.id} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                    student.gender === "male" ? "bg-blue-500" : "bg-pink-500"
                  }`}
                >
                  {student.name.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {student.name}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {student.isAdmin && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-white">
                        <Shield className="h-3 w-3" /> Admin
                      </span>
                    )}
                    {student.isFocalPerson && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        <Star className="h-3 w-3" /> Focal
                      </span>
                    )}
                    {student.isClassRep && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        <Award className="h-3 w-3" /> Class Rep
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => openEditModal(student)}
                  className="shrink-0 rounded-lg p-1.5 text-text-secondary transition hover:bg-bg-muted hover:text-text-primary"
                  title="Edit student"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
      </LoadingContent>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingStudent ? "Edit Student" : "Add Student"}
      >
        <div className="space-y-4">
          <label className="block text-xs font-medium text-text-secondary">
            Student name
            <input
              type="text"
              value={formData.name}
              onChange={(event) =>
                setFormData({ ...formData, name: event.target.value })
              }
              placeholder="Enter complete name"
              className="mt-1.5 w-full rounded-xl bg-bg-muted px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
            />
          </label>

          <label className="block text-xs font-medium text-text-secondary">
            Gender
            <select
              value={formData.gender}
              onChange={(event) =>
                setFormData({ ...formData, gender: event.target.value })
              }
              className="mt-1.5 w-full rounded-xl bg-bg-muted px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>

          {editingStudent && (
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                ["isAdmin", "Admin"],
                ["isFocalPerson", "Focal Person"],
                ["isClassRep", "Class Representative"],
              ].map(([field, label]) => (
                <label
                  key={field}
                  className="flex cursor-pointer items-center gap-2 rounded-xl bg-bg-muted p-3 text-xs text-text-primary"
                >
                  <input
                    type="checkbox"
                    checked={formData[field]}
                    onChange={(event) =>
                      setFormData({ ...formData, [field]: event.target.checked })
                    }
                    className="h-4 w-4 accent-[var(--color-accent)]"
                  />
                  {label}
                </label>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {editingStudent ? "Save Changes" : "Add Student"}
            </Button>
          </div>

          {editingStudent && (
            <div className="border-t border-border pt-3">
              <Button
                variant="danger"
                className="w-full justify-center"
                onClick={() => {
                  setModalOpen(false);
                  setStudentToDelete(editingStudent);
                  setDeleteModalOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Remove Student
              </Button>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Remove Student"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Remove <strong className="text-text-primary">{studentToDelete?.name}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={saving}>
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
