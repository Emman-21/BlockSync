import { collection, doc, serverTimestamp } from "./trackedFirestore";
import { getDocs, setDoc } from "./trackedFirestore";
import { db } from "../config/firebase";

const clean = (value) => String(value ?? "").trim();
const normalizeKey = (value) => clean(value).toLowerCase().replace(/\s+/g, " ");

export const discoverClassroomCourses = (contents = []) => {
  const courses = new Map();

  contents.forEach((content) => {
    const name = clean(
      content.courseName || content.subjectName || content.className
    );
    const courseId =
      clean(
        content.courseId ||
          content.classroomCourseId ||
          content.googleCourseId
      ) || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    if (!name || !courseId) return;
    if (!courses.has(courseId)) {
      courses.set(courseId, {
        courseId,
        name,
        section: clean(content.section),
        alternateLink: clean(content.courseAlternateLink),
      });
    }
  });

  return [...courses.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
};

const safeDocumentId = (value) =>
  clean(value).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 500);

const hasUsefulText = (value) => clean(value).length > 0;
const hasUsefulArray = (value) => Array.isArray(value) && value.length > 0;

const mergeLegacyDetails = (current = {}, legacy = {}) => ({
  color: hasUsefulText(current.color)
    ? current.color
    : legacy.color || "bg-violet-500",
  units: Number(current.units) || Number(legacy.units) || 3,
  instructor: hasUsefulText(current.instructor)
    ? current.instructor
    : legacy.instructor || "",
  googleClassroomCode: hasUsefulText(current.googleClassroomCode)
    ? current.googleClassroomCode
    : legacy.googleClassroomCode || "",
  schedule: hasUsefulArray(current.schedule)
    ? current.schedule
    : legacy.schedule || [],
  links: hasUsefulArray(current.links)
    ? current.links
    : legacy.links || [],
});

export const syncClassroomCoursesToSubjects = async ({
  courses,
  semesterId,
}) => {
  if (!semesterId) throw new Error("Activate a semester before syncing.");
  if (!Array.isArray(courses) || courses.length === 0) {
    throw new Error("Select at least one Google Classroom subject.");
  }

  const existingSnapshot = await getDocs(collection(db, "subjects"));
  const subjects = existingSnapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));

  let created = 0;
  let updated = 0;
  let migrated = 0;
  let archivedDuplicates = 0;

  for (const course of courses) {
    const courseId = clean(course.courseId);
    const courseNameKey = normalizeKey(course.name);

    const activeMatch = subjects.find(
      (subject) =>
        clean(subject.semesterId) === semesterId &&
        clean(subject.classroomCourseId) === courseId
    );

    const legacyMatch = subjects.find(
      (subject) =>
        !clean(subject.semesterId) &&
        subject.archived !== true &&
        (clean(subject.classroomCourseId) === courseId ||
          normalizeKey(subject.name) === courseNameKey)
    );

    const baseClassroomData = {
      name: course.name,
      classroomCourseId: courseId,
      classroomAlternateLink: course.alternateLink || "",
      semesterId,
      syncEnabled: true,
      archived: false,
      updatedAt: serverTimestamp(),
    };

    if (activeMatch) {
      const legacyDetails = legacyMatch
        ? mergeLegacyDetails(activeMatch, legacyMatch)
        : mergeLegacyDetails(activeMatch, {});

      const currentLinks = legacyDetails.links;
      const hasClassroomLink = currentLinks.some(
        (link) => clean(link?.url) === clean(course.alternateLink)
      );

      await setDoc(
        doc(db, "subjects", activeMatch.id),
        {
          ...baseClassroomData,
          ...legacyDetails,
          links:
            course.alternateLink && !hasClassroomLink
              ? [
                  ...currentLinks,
                  { label: "Google Classroom", url: course.alternateLink },
                ]
              : currentLinks,
        },
        { merge: true }
      );

      updated += 1;

      if (legacyMatch && legacyMatch.id !== activeMatch.id) {
        await setDoc(
          doc(db, "subjects", legacyMatch.id),
          { archived: true, updatedAt: serverTimestamp() },
          { merge: true }
        );
        archivedDuplicates += 1;
      }

      continue;
    }

    if (legacyMatch) {
      const legacyLinks = Array.isArray(legacyMatch.links)
        ? legacyMatch.links
        : [];
      const hasClassroomLink = legacyLinks.some(
        (link) => clean(link?.url) === clean(course.alternateLink)
      );

      await setDoc(
        doc(db, "subjects", legacyMatch.id),
        {
          ...baseClassroomData,
          links:
            course.alternateLink && !hasClassroomLink
              ? [
                  ...legacyLinks,
                  { label: "Google Classroom", url: course.alternateLink },
                ]
              : legacyLinks,
        },
        { merge: true }
      );

      legacyMatch.semesterId = semesterId;
      legacyMatch.classroomCourseId = courseId;
      legacyMatch.archived = false;
      migrated += 1;
      continue;
    }

    const subjectId = `classroom_${safeDocumentId(
      semesterId
    )}_${safeDocumentId(courseId)}`;

    await setDoc(
      doc(db, "subjects", subjectId),
      {
        ...baseClassroomData,
        color: "bg-violet-500",
        units: 3,
        instructor: "",
        googleClassroomCode: "",
        schedule: [],
        links: course.alternateLink
          ? [{ label: "Google Classroom", url: course.alternateLink }]
          : [],
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    subjects.push({
      id: subjectId,
      ...baseClassroomData,
    });
    created += 1;
  }

  return { created, updated, migrated, archivedDuplicates };
};
