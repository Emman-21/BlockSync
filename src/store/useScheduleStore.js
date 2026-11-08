import { useUIStore } from "./useUIStore";
import { create } from "zustand";
import {
  subscribeSchedules,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  fetchSchedules,
} from "../services/scheduleService";

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const normalizeText = (value) => String(value || "").trim();

const normalizeSchedules = (schedules = []) =>
  schedules
    .filter((schedule) => {
      if (!schedule?.id || !schedule?.day) return false;
      return Boolean(normalizeText(schedule.subjectName));
    })
    .map((schedule) => ({
      ...schedule,
      scheduleKind:
        normalizeText(schedule.scheduleKind) === "exam" ? "exam" : "class",
      day: normalizeText(schedule.day),
      startTime: normalizeText(schedule.startTime),
      endTime: normalizeText(schedule.endTime),
      subjectName: normalizeText(schedule.subjectName),
      instructor: normalizeText(schedule.instructor),
      examType: normalizeText(schedule.examType) || "Prelims",
      examDate: normalizeText(schedule.examDate),
      description: normalizeText(schedule.description),
      attachments: (Array.isArray(schedule.attachments) ? schedule.attachments : [])
        .map((attachment) => ({
          name: normalizeText(attachment?.name),
          url: normalizeText(attachment?.url),
        }))
        .filter((attachment) => attachment.name && attachment.url),
      room: normalizeText(schedule.room),
      type: normalizeText(schedule.type) || "f2f",
    }))
    .sort((first, second) => {
      const firstDay = DAY_ORDER.indexOf(first.day);
      const secondDay = DAY_ORDER.indexOf(second.day);
      const safeFirstDay = firstDay === -1 ? DAY_ORDER.length : firstDay;
      const safeSecondDay = secondDay === -1 ? DAY_ORDER.length : secondDay;

      if (safeFirstDay !== safeSecondDay) {
        return safeFirstDay - safeSecondDay;
      }

      return first.startTime.localeCompare(second.startTime);
    });

const getErrorMessage = (error, fallback) => error?.message || fallback;

export const useScheduleStore = create((set, get) => ({
  schedules: [],
  loading: true,
  firebaseError: false,
  errorMessage: "",

  load: () => {
    set({
      loading: true,
      firebaseError: false,
      errorMessage: "",
    });

    const unsubscribe = subscribeSchedules(
      (firebaseSchedules) => {
        set({
          schedules: normalizeSchedules(firebaseSchedules),
          loading: false,
          firebaseError: false,
          errorMessage: "",
        });
      },
      (error) => {
        set({
          schedules: ["permission-denied", "unauthenticated"].includes(error?.code) ? [] : get().schedules,
          loading: false,
          firebaseError: true,
          errorMessage: getErrorMessage(
            error,
            "Unable to load schedules from Firestore."
          ),
        });
      }
    );

    return typeof unsubscribe === "function" ? unsubscribe : () => {};
  },

  refresh: async () => {
    set({
      loading: true,
      firebaseError: false,
      errorMessage: "",
    });

    try {
      const schedules = await fetchSchedules();

      set({
        schedules: normalizeSchedules(schedules),
        loading: false,
        firebaseError: false,
        errorMessage: "",
      });
    } catch (error) {
      set({
        loading: false,
        firebaseError: true,
        errorMessage: getErrorMessage(
          error,
          "Unable to refresh schedules from Firestore."
        ),
      });
      throw error;
    }
  },

  addSchedule: async (data) => {
    try {
      const documentReference = await addSchedule(data);
      set({ firebaseError: false, errorMessage: "" });
      useUIStore.getState().celebrateDrumpyy();
      return documentReference;
    } catch (error) {
      set({
        firebaseError: true,
        errorMessage: getErrorMessage(
          error,
          "Unable to add the schedule to Firestore."
        ),
      });
      throw error;
    }
  },

  updateSchedule: async (id, data) => {
    try {
      await updateSchedule(id, data);
      set({ firebaseError: false, errorMessage: "" });
    } catch (error) {
      set({
        firebaseError: true,
        errorMessage: getErrorMessage(
          error,
          "Unable to update the schedule in Firestore."
        ),
      });
      throw error;
    }
  },

  deleteSchedule: async (id) => {
    try {
      await deleteSchedule(id);
      set({ firebaseError: false, errorMessage: "" });
    } catch (error) {
      set({
        firebaseError: true,
        errorMessage: getErrorMessage(
          error,
          "Unable to delete the schedule from Firestore."
        ),
      });
      throw error;
    }
  },

  clearError: () =>
    set({
      firebaseError: false,
      errorMessage: "",
    }),
}));
