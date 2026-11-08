import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
} from "./trackedFirestore";
import { db } from "../config/firebase";

const COLLECTION_NAME = "schedules";

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const schedulesCollection = () => collection(db, COLLECTION_NAME);
const schedulesQuery = () => query(schedulesCollection());
const normalizeText = (value) => String(value || "").trim();
const normalizeAttachments = (attachments) =>
  (Array.isArray(attachments) ? attachments : [])
    .map((attachment) => ({
      name: normalizeText(attachment?.name),
      url: normalizeText(attachment?.url),
    }))
    .filter((attachment) => attachment.name && attachment.url);

const sortSchedules = (schedules = []) =>
  [...schedules].sort((first, second) => {
    const firstDay = DAY_ORDER.indexOf(first.day);
    const secondDay = DAY_ORDER.indexOf(second.day);
    const safeFirstDay = firstDay === -1 ? DAY_ORDER.length : firstDay;
    const safeSecondDay = secondDay === -1 ? DAY_ORDER.length : secondDay;

    if (safeFirstDay !== safeSecondDay) {
      return safeFirstDay - safeSecondDay;
    }

    return normalizeText(first.startTime).localeCompare(
      normalizeText(second.startTime)
    );
  });

const sanitizeSchedule = (data = {}) => ({
  scheduleKind: normalizeText(data.scheduleKind) === "exam" ? "exam" : "class",
  day: normalizeText(data.day),
  startTime: normalizeText(data.startTime),
  endTime: normalizeText(data.endTime),
  subjectName: normalizeText(data.subjectName),
  instructor: normalizeText(data.instructor),
  examType: normalizeText(data.examType),
  examDate: normalizeText(data.examDate),
  description: normalizeText(data.description),
  attachments: normalizeAttachments(data.attachments),
  room: normalizeText(data.room),
  type: normalizeText(data.type) || "f2f",
});

const sanitizeSchedulePatch = (data = {}) => {
  const patch = {};

  if (Object.prototype.hasOwnProperty.call(data, "attachments")) {
    patch.attachments = normalizeAttachments(data.attachments);
  }

  [
    "scheduleKind",
    "day",
    "startTime",
    "endTime",
    "subjectName",
    "instructor",
    "examType",
    "examDate",
    "description",
    "room",
    "type",
  ].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      patch[field] = normalizeText(data[field]);
    }
  });

  if (Object.prototype.hasOwnProperty.call(patch, "scheduleKind")) {
    patch.scheduleKind = patch.scheduleKind === "exam" ? "exam" : "class";
  }

  if (Object.prototype.hasOwnProperty.call(patch, "type") && !patch.type) {
    patch.type = "f2f";
  }

  return patch;
};

const validateSchedule = (schedule, requireAllFields = true) => {
  ["day", "startTime", "endTime"].forEach((field) => {
    if (
      (requireAllFields ||
        Object.prototype.hasOwnProperty.call(schedule, field)) &&
      !schedule[field]
    ) {
      throw new Error(`${field} is required.`);
    }
  });

  if (
    (requireAllFields ||
      Object.prototype.hasOwnProperty.call(schedule, "subjectName")) &&
    !schedule.subjectName
  ) {
    throw new Error("Subject name is required.");
  }

  if (
    schedule.scheduleKind === "exam" &&
    (requireAllFields ||
      Object.prototype.hasOwnProperty.call(schedule, "examDate")) &&
    !schedule.examDate
  ) {
    throw new Error("Examination date is required.");
  }

  if (
    schedule.startTime &&
    schedule.endTime &&
    schedule.endTime <= schedule.startTime
  ) {
    throw new Error("End time must be later than start time.");
  }
};

export const fetchSchedules = async () => {
  const snapshot = await getDocs(schedulesQuery());

  return sortSchedules(
    snapshot.docs.map((scheduleDocument) => ({
      id: scheduleDocument.id,
      ...scheduleDocument.data(),
    }))
  );
};

export const addSchedule = async (data) => {
  const schedule = sanitizeSchedule(data);
  validateSchedule(schedule);

  return addDoc(schedulesCollection(), {
    ...schedule,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateSchedule = async (id, data) => {
  if (!id) {
    throw new Error("Schedule ID is required.");
  }

  const patch = sanitizeSchedulePatch(data);
  validateSchedule(patch, false);

  await updateDoc(doc(db, COLLECTION_NAME, id), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
};

export const deleteSchedule = async (id) => {
  if (!id) {
    throw new Error("Schedule ID is required.");
  }

  await deleteDoc(doc(db, COLLECTION_NAME, id));
};

export const subscribeSchedules = (callback, onError) =>
  onSnapshot(
    schedulesQuery(),
    (snapshot) => {
      callback(
        sortSchedules(
          snapshot.docs.map((scheduleDocument) => ({
            id: scheduleDocument.id,
            ...scheduleDocument.data(),
          }))
        )
      );
    },
    (error) => {
      console.error("Unable to subscribe to schedules:", error);
      onError?.(error);
    }
  );
