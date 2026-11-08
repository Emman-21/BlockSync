import {
  collection,
  doc,
  serverTimestamp,
} from "./trackedFirestore";
import { addDoc, deleteDoc, onSnapshot, updateDoc } from "./trackedFirestore";
import { db } from "../config/firebase";

const COLLECTION_NAME = "subjects";

const subjectsCollection = () =>
  collection(db, COLLECTION_NAME);

const normalizeText = (value) =>
  String(value ?? "").trim();

const normalizeColor = (value = "") => {
  const color = normalizeText(value);
  if (!color) return "bg-violet-500";
  if (color.startsWith("bg-")) return color;

  const legacyColors = {
    "from-purple-500 to-indigo-500": "bg-violet-500",
    "from-pink-500 to-rose-500": "bg-pink-500",
    "from-blue-500 to-cyan-500": "bg-blue-500",
    "from-green-500 to-emerald-500": "bg-emerald-500",
    "from-red-500 to-orange-500": "bg-red-500",
    "from-teal-500 to-cyan-500": "bg-teal-500",
    "from-fuchsia-500 to-pink-500": "bg-fuchsia-500",
    "from-sky-500 to-blue-500": "bg-sky-500",
    "from-lime-500 to-green-500": "bg-lime-500",
    "from-amber-500 to-yellow-500": "bg-amber-500",
    "from-gray-400 to-gray-500": "bg-slate-500",
  };

  return legacyColors[color] || "bg-violet-500";
};

const removeUndefinedValues = (data) =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([, value]) => value !== undefined
    )
  );

const sanitizeSubject = (subject = {}) => ({
  name: normalizeText(subject.name),

  color: normalizeColor(subject.color),

  units: Number(subject.units) || 3,

  instructor: normalizeText(
    subject.instructor
  ),

  googleClassroomCode: normalizeText(
    subject.googleClassroomCode
  ),

  classroomCourseId: normalizeText(subject.classroomCourseId),
  classroomAlternateLink: normalizeText(subject.classroomAlternateLink),
  semesterId: normalizeText(subject.semesterId),
  syncEnabled: subject.syncEnabled === true,
  archived: subject.archived === true,

  schedule: Array.isArray(subject.schedule)
    ? subject.schedule
    : [],

  links: Array.isArray(subject.links)
    ? subject.links
    : [],

  syllabusItems: Array.isArray(subject.syllabusItems)
    ? subject.syllabusItems.map((item) => ({
        title: String(item?.title || "").trim(),
        percentage: Number(item?.percentage) || 0,
      })).filter((item) => item.title || item.percentage > 0)
    : [],
});

const sanitizeSubjectPatch = (data = {}) => {
  const patch = {
    ...data,
  };

  delete patch.id;
  delete patch.createdAt;
  delete patch.updatedAt;

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "name"
    )
  ) {
    patch.name = normalizeText(data.name);
  }

  ["classroomCourseId", "classroomAlternateLink", "semesterId"].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      patch[field] = normalizeText(data[field]);
    }
  });

  ["syncEnabled", "archived"].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      patch[field] = data[field] === true;
    }
  });

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "color"
    )
  ) {
    patch.color = normalizeColor(data.color);
  }

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "units"
    )
  ) {
    patch.units = Number(data.units) || 3;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "instructor"
    )
  ) {
    patch.instructor = normalizeText(
      data.instructor
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "googleClassroomCode"
    )
  ) {
    patch.googleClassroomCode =
      normalizeText(
        data.googleClassroomCode
      );
  }

  [
    "schedule",
    "links",
    "syllabusItems",
  ].forEach((field) => {
    if (
      Object.prototype.hasOwnProperty.call(
        data,
        field
      )
    ) {
      patch[field] = Array.isArray(
        data[field]
      )
        ? data[field]
        : [];
    }
  });

  return removeUndefinedValues(patch);
};

export const subscribeSubjects = (
  callback,
  onError
) => {
  if (typeof callback !== "function") {
    throw new Error(
      "A subject subscription callback is required."
    );
  }

  return onSnapshot(
    subjectsCollection(),

    (snapshot) => {
      const subjects = snapshot.docs
        .map((subjectDocument) => ({
          id: subjectDocument.id,
          ...subjectDocument.data(),
        }))
        .sort((first, second) =>
          String(first.name || "").localeCompare(
            String(second.name || "")
          )
        );

      callback(subjects);
    },

    (error) => {
      console.error(
        "Unable to subscribe to subjects:",
        error
      );

      if (typeof onError === "function") {
        onError(error);
      }
    }
  );
};

export const addSubject = async (data) => {
  const subject = sanitizeSubject(data);

  if (!subject.name) {
    throw new Error(
      "Subject name is required."
    );
  }

  return addDoc(subjectsCollection(), {
    ...subject,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateSubject = async (
  id,
  data
) => {
  const subjectId = normalizeText(id);

  if (!subjectId) {
    throw new Error(
      "Subject ID is required."
    );
  }

  const patch =
    sanitizeSubjectPatch(data);

  if (
    Object.prototype.hasOwnProperty.call(
      patch,
      "name"
    ) &&
    !patch.name
  ) {
    throw new Error(
      "Subject name is required."
    );
  }

  await updateDoc(
    doc(db, COLLECTION_NAME, subjectId),
    {
      ...patch,
      updatedAt: serverTimestamp(),
    }
  );
};

export const deleteSubject = async (id) => {
  const subjectId = normalizeText(id);

  if (!subjectId) {
    throw new Error(
      "Subject ID is required."
    );
  }

  await deleteDoc(
    doc(db, COLLECTION_NAME, subjectId)
  );
};
