import { LoadingContent, CardSkeletonGrid } from "../ui/Skeleton";
import { useEffect, useMemo, useState } from "react";
import { Archive, BookOpen, CalendarRange, Plus, RefreshCw } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import {
  activateSemester,
  archiveSemester,
  createSemester,
  subscribeSemesters,
} from "../../services/semesterService";
import {
  discoverClassroomCourses,
  syncClassroomCoursesToSubjects,
} from "../../services/classroomCourseSyncService";
import { useClassroomContentsStore } from "../../store/useClassroomContentsStore";

export default function SemesterClassroomManager({ StatusMessage }) {
  const [semesters, setSemesters] = useState([]);
  const [semesterLoading, setSemesterLoading] = useState(true);
  const [semesterError, setSemesterError] = useState("");
  const [name, setName] = useState("First Semester");
  const [schoolYear, setSchoolYear] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const { contents, loading, error, load, unsubscribe: classroomSubscription } = useClassroomContentsStore();

  useEffect(() => subscribeSemesters((records) => { setSemesters(records); setSemesterLoading(false); setSemesterError(""); }, (err) => {
    setSemesterLoading(false); setSemesterError(err.message || "Unable to load semesters.");
  }), []);

  useEffect(() => {
    const unsubscribe = load();
    return () => unsubscribe?.();
  }, [load]);

  const activeSemester = semesters.find((item) => item.status === "active");
  const courses = useMemo(() => discoverClassroomCourses(contents), [contents]);

  const run = async (work, successText) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await work();
      setMessage({
        type: "success",
        text: typeof successText === "function" ? successText(result) : successText,
      });
    } catch (err) {
      setMessage({ type: "error", text: err.message || "The request failed." });
    } finally {
      setBusy(false);
    }
  };

  const toggleCourse = (courseId) => {
    setSelectedCourseIds((current) =>
      current.includes(courseId)
        ? current.filter((id) => id !== courseId)
        : [...current, courseId]
    );
  };

  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-violet-500/10 p-2.5 text-violet-600 dark:text-violet-400">
          <CalendarRange className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold">Semester & Google Classroom</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Keep previous subjects archived, then connect newly detected Classroom courses to the active semester.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Second Semester"
          className="rounded-xl bg-bg-muted px-3 py-2.5 text-sm outline-none focus-visible:outline-2 focus-visible:outline-accent" />
        <input value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} placeholder="e.g. 2026–2027"
          className="rounded-xl bg-bg-muted px-3 py-2.5 text-sm outline-none focus-visible:outline-2 focus-visible:outline-accent" />
        <Button size="sm" disabled={busy} onClick={() => run(
          () => createSemester({ name, schoolYear }),
          "Semester created. Activate it before syncing subjects."
        )}><Plus className="mr-2 h-4 w-4" />Create</Button>
      </div>

      <LoadingContent loading={semesterLoading} hasData={semesters.length > 0} error={semesterError} label="Semesters" skeleton={<div className="mt-4"><CardSkeletonGrid kind="semester" count={2} className="space-y-2" /></div>}>
<div className="mt-4 space-y-2">
        {semesters.length === 0 && <p className="text-sm text-text-secondary">No semester created yet.</p>}
        {semesters.map((semester) => (
          <div key={semester.id} className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">{semester.name} · {semester.schoolYear}</p>
              <p className="text-xs capitalize text-text-secondary">{semester.status}</p>
            </div>
            <div className="flex gap-2">
              {semester.status !== "active" && semester.status !== "archived" && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => run(
                  () => activateSemester(semester.id), "Active semester updated."
                )}>Activate</Button>
              )}
              {semester.status !== "archived" && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => {
                  if (window.confirm("Archive this semester and hide its subjects from the active list?")) {
                    run(() => archiveSemester(semester.id), "Semester archived.");
                  }
                }}><Archive className="mr-2 h-4 w-4" />Archive</Button>
              )}
            </div>
          </div>
        ))}
      </div>
</LoadingContent>

      <div className="mt-6 border-t border-border pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold"><BookOpen className="h-4 w-4" />Detected Classroom subjects</h3>
            <p className="mt-1 text-xs text-text-secondary">
              {activeSemester ? `Will sync to ${activeSemester.name} · ${activeSemester.schoolYear}` : "Activate a semester first."}
            </p>
          </div>
          <Button size="sm" variant="outline" disabled={loading} onClick={() => load()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh detected courses
          </Button>
        </div>

        {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}
        <LoadingContent loading={loading || (!classroomSubscription && !error)} hasData={courses.length > 0} error={error} errorFallback={null} label="Detected courses" skeleton={<CardSkeletonGrid kind="course" count={4} className="mt-3 grid gap-2 sm:grid-cols-2" />}>
<div className="mt-3 grid gap-2 sm:grid-cols-2">
          {courses.map((course) => (
            <label key={course.courseId} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
              <input type="checkbox" className="mt-1" checked={selectedCourseIds.includes(course.courseId)} onChange={() => toggleCourse(course.courseId)} />
              <span><span className="block text-sm font-medium">{course.name}</span><span className="text-xs text-text-secondary">Course ID: {course.courseId}</span></span>
            </label>
          ))}
        </div>
</LoadingContent>
        {!loading && !!classroomSubscription && !error && courses.length === 0 && (
          <p className="mt-3 rounded-xl bg-bg-muted p-3 text-xs text-text-secondary">
            No Classroom courses detected. Run your Google Classroom automation first; this page reads the courses already saved in classroomContents.
          </p>
        )}

        <Button className="mt-4" size="sm" disabled={busy || !activeSemester || selectedCourseIds.length === 0}
          onClick={() => run(
            () => syncClassroomCoursesToSubjects({
              semesterId: activeSemester.id,
              courses: courses.filter((course) => selectedCourseIds.includes(course.courseId)),
            }),
            (result) => {
              const parts = [
                `${result.created} added`,
                `${result.updated} updated`,
                `${result.migrated || 0} existing subject(s) linked to this semester`,
              ];
              if (result.archivedDuplicates) {
                parts.push(`${result.archivedDuplicates} duplicate(s) archived`);
              }
              return `${parts.join(", ")}.`;
            }
          )}>Sync selected subjects</Button>
      </div>

      <div className="mt-4"><StatusMessage message={message} /></div>
    </Card>
  );
}
