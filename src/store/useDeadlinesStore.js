import { useUIStore } from "./useUIStore";
// src/store/useDeadlinesStore.js
import { create } from "zustand";
import {
  subscribeDeadlines,
  addDeadline as addDeadlineToFirestore,
  updateDeadline as updateDeadlineInFirestore,
  deleteDeadline as deleteDeadlineFromFirestore,
} from "../services/deadlineService";
import {
  DEADLINE_TYPES,
  detectDeadlineType,
} from "../utils/deadlineTypes";

const DEFAULT_DEADLINE = {
  subjectName: "",
  title: "",
  description: "",
  dueDate: "",
  noFixedDeadline: false,
  attachments: [],
  type: DEADLINE_TYPES.REGULAR,
};

const VALID_TYPES = new Set(Object.values(DEADLINE_TYPES));

const resolveType = (deadline = {}) => {
  if (deadline.type && VALID_TYPES.has(deadline.type)) {
    return deadline.type;
  }
  return detectDeadlineType(deadline.title, deadline.description);
};

const normalizeDeadline = (deadline = {}) => ({
  ...DEFAULT_DEADLINE,
  ...deadline,

  subjectName: String(deadline.subjectName || "").trim(),
  title: String(deadline.title || "").trim(),
  description: String(deadline.description || ""),
  dueDate: deadline.dueDate || "",
  noFixedDeadline:
    Boolean(deadline.noFixedDeadline) || !deadline.dueDate,
  attachments: Array.isArray(deadline.attachments)
    ? deadline.attachments
    : [],
  type: resolveType(deadline),
});

const normalizeDeadlines = (deadlines = []) =>
  deadlines
    .filter((deadline) => deadline?.id)
    .map(normalizeDeadline);

const getErrorMessage = (error, fallback) =>
  error?.message || fallback;

export const useDeadlinesStore = create((set, get) => ({
  deadlines: [],
  loading: true,
  firebaseError: false,
  errorMessage: "",

  load: () => {
    set({ loading: true, firebaseError: false, errorMessage: "" });

    try {
      const unsubscribe = subscribeDeadlines(
        (firestoreDeadlines) => {
          set({
            deadlines: normalizeDeadlines(firestoreDeadlines),
            loading: false,
            firebaseError: false,
            errorMessage: "",
          });
        },
        (error) => {
          set({
            deadlines: ["permission-denied", "unauthenticated"].includes(error?.code) ? [] : get().deadlines,
            loading: false,
            firebaseError: true,
            errorMessage: getErrorMessage(
              error,
              "Unable to load the deadlines from Firestore."
            ),
          });
        }
      );

      return typeof unsubscribe === "function" ? unsubscribe : () => {};
    } catch (error) {
      set({
        deadlines: ["permission-denied", "unauthenticated"].includes(error?.code) ? [] : get().deadlines,
        loading: false,
        firebaseError: true,
        errorMessage: getErrorMessage(
          error,
          "Unable to connect to the Firestore deadlines collection."
        ),
      });
      return () => {};
    }
  },

  getDeadlineById: (id) =>
    get().deadlines.find((deadline) => deadline.id === id),

  addDeadline: async (data) => {
    const deadline = normalizeDeadline(data);

    if (!deadline.title) {
      throw new Error("Deadline title is required.");
    }
    if (!deadline.noFixedDeadline && !deadline.dueDate) {
      throw new Error("Deadline date is required.");
    }

    try {
      const documentReference = await addDeadlineToFirestore(deadline);
      set({ firebaseError: false, errorMessage: "" });
      useUIStore.getState().celebrateDrumpyy();
      return documentReference;
    } catch (error) {
      set({
        firebaseError: true,
        errorMessage: getErrorMessage(
          error,
          "Unable to add the deadline to Firestore."
        ),
      });
      throw error;
    }
  },

  updateDeadline: async (id, data) => {
    if (!id) {
      throw new Error("Deadline ID is required.");
    }

    const updates = {
      ...data,

      ...(data.subjectName !== undefined
        ? { subjectName: String(data.subjectName || "").trim() }
        : {}),

      ...(data.title !== undefined
        ? { title: String(data.title || "").trim() }
        : {}),

      ...(data.description !== undefined
        ? { description: String(data.description || "") }
        : {}),

      ...(data.attachments !== undefined
        ? {
            attachments: Array.isArray(data.attachments)
              ? data.attachments
              : [],
          }
        : {}),

      ...(data.type !== undefined
        ? {
            type: VALID_TYPES.has(data.type)
              ? data.type
              : DEADLINE_TYPES.REGULAR,
          }
        : {}),
    };

    if (data.title !== undefined && !updates.title) {
      throw new Error("Deadline title is required.");
    }

    if (
      data.dueDate !== undefined &&
      !data.dueDate &&
      !updates.noFixedDeadline
    ) {
      throw new Error("Deadline date is required.");
    }

    try {
      await updateDeadlineInFirestore(id, updates);
      set({ firebaseError: false, errorMessage: "" });
    } catch (error) {
      set({
        firebaseError: true,
        errorMessage: getErrorMessage(
          error,
          "Unable to update the deadline in Firestore."
        ),
      });
      throw error;
    }
  },

  deleteDeadline: async (id) => {
    if (!id) {
      throw new Error("Deadline ID is required.");
    }

    try {
      await deleteDeadlineFromFirestore(id);
      set({ firebaseError: false, errorMessage: "" });
    } catch (error) {
      set({
        firebaseError: true,
        errorMessage: getErrorMessage(
          error,
          "Unable to delete the deadline from Firestore."
        ),
      });
      throw error;
    }
  },

  renameSubject: async (oldName, newName) => {
    const normalizedOldName = String(oldName || "").trim();
    const normalizedNewName = String(newName || "").trim();

    if (
      !normalizedOldName ||
      !normalizedNewName ||
      normalizedOldName === normalizedNewName
    ) {
      return 0;
    }

    const affectedDeadlines = get().deadlines.filter(
      (deadline) => deadline.subjectName === normalizedOldName
    );

    if (affectedDeadlines.length === 0) return 0;

    try {
      await Promise.all(
        affectedDeadlines.map((deadline) =>
          updateDeadlineInFirestore(deadline.id, {
            subjectName: normalizedNewName,
          })
        )
      );

      set({ firebaseError: false, errorMessage: "" });
      return affectedDeadlines.length;
    } catch (error) {
      set({
        firebaseError: true,
        errorMessage: getErrorMessage(
          error,
          "The subject was renamed, but some related deadlines could not be updated."
        ),
      });
      throw error;
    }
  },

  clearError: () => set({ firebaseError: false, errorMessage: "" }),
}));