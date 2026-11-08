import { useUIStore } from "./useUIStore";
import { create } from "zustand";
import {
  subscribeSubjects,
  addSubject as addSubjectToFirestore,
  updateSubject as updateSubjectInFirestore,
  deleteSubject as deleteSubjectFromFirestore,
} from "../services/subjectService";
import { useDeadlinesStore } from "./useDeadlinesStore";

const DEFAULT_SUBJECT = {
  name: "",
  color: "bg-violet-500",
  units: 3,
  instructor: "",
  googleClassroomCode: "",
  classroomCourseId: "",
  classroomAlternateLink: "",
  semesterId: "",
  syncEnabled: false,
  archived: false,
  schedule: [],
  links: [],
  syllabusItems: [],
};

const normalizeSubject = (subject = {}) => ({
  ...DEFAULT_SUBJECT,
  ...subject,

  name: String(
    subject.name || ""
  ).trim(),

  color: String(
    subject.color ||
      DEFAULT_SUBJECT.color
  ),

  units:
    Number(subject.units) || 3,

  instructor: String(
    subject.instructor || ""
  ).trim(),

  googleClassroomCode: String(
    subject.googleClassroomCode || ""
  ).trim(),

  classroomCourseId: String(subject.classroomCourseId || "").trim(),
  classroomAlternateLink: String(subject.classroomAlternateLink || "").trim(),
  semesterId: String(subject.semesterId || "").trim(),
  syncEnabled: subject.syncEnabled === true,
  archived: subject.archived === true,

  schedule: Array.isArray(
    subject.schedule
  )
    ? subject.schedule
    : [],

  links: Array.isArray(
    subject.links
  )
    ? subject.links
    : [],

  syllabusItems: Array.isArray(
    subject.syllabusItems
  )
    ? subject.syllabusItems
        .map((item) => ({
          title: String(item?.title || "").trim(),
          percentage: Number(item?.percentage) || 0,
        }))
        .filter((item) => item.title || item.percentage > 0)
    : [],
});

const normalizeSubjects = (
  subjects = []
) =>
  subjects
    .filter((subject) => subject?.id && subject?.name && subject.archived !== true)
    .map(normalizeSubject);

const getErrorMessage = (
  error,
  fallback
) => error?.message || fallback;

export const useSubjectsStore = create(
  (set, get) => ({
    subjects: [],
    loading: true,
    firebaseError: false,
    errorMessage: "",

    load: () => {
      set({
        loading: true,
        firebaseError: false,
        errorMessage: "",
      });

      try {
        const unsubscribe =
          subscribeSubjects(
            (firestoreSubjects) => {
              set({
                subjects:
                  normalizeSubjects(
                    firestoreSubjects
                  ),

                loading: false,
                firebaseError: false,
                errorMessage: "",
              });
            },

            (error) => {
              set({
                subjects: ["permission-denied", "unauthenticated"].includes(error?.code) ? [] : get().subjects,
                loading: false,
                firebaseError: true,

                errorMessage:
                  getErrorMessage(
                    error,
                    "Unable to load the subjects from Firestore."
                  ),
              });
            }
          );

        return typeof unsubscribe ===
          "function"
          ? unsubscribe
          : () => {};
      } catch (error) {
        set({
          subjects: ["permission-denied", "unauthenticated"].includes(error?.code) ? [] : get().subjects,
          loading: false,
          firebaseError: true,

          errorMessage:
            getErrorMessage(
              error,
              "Unable to connect to the Firestore subjects collection."
            ),
        });

        return () => {};
      }
    },

    getSubjectById: (id) =>
      get().subjects.find(
        (subject) =>
          subject.id === id
      ),

    addSubject: async (data) => {
      const subject =
        normalizeSubject(data);

      if (!subject.name) {
        throw new Error(
          "Subject name is required."
        );
      }

      try {
        const documentReference =
          await addSubjectToFirestore(
            subject
          );

        set({
          firebaseError: false,
          errorMessage: "",
        });

        useUIStore.getState().celebrateDrumpyy();

        return documentReference;
      } catch (error) {
        set({
          firebaseError: true,

          errorMessage:
            getErrorMessage(
              error,
              "Unable to add the subject to Firestore."
            ),
        });

        throw error;
      }
    },

    updateSubject: async (
      id,
      data
    ) => {
      if (!id) {
        throw new Error(
          "Subject ID is required."
        );
      }

      const oldSubject =
        get().subjects.find(
          (subject) =>
            subject.id === id
        );

      const oldName =
        oldSubject?.name || "";

      const nextName =
        data.name === undefined
          ? oldName
          : String(
              data.name || ""
            ).trim();

      if (
        data.name !== undefined &&
        !nextName
      ) {
        throw new Error(
          "Subject name is required."
        );
      }

      const updates = {
        ...data,

        ...(data.name !== undefined
          ? {
              name: nextName,
            }
          : {}),

        ...(data.units !== undefined
          ? {
              units:
                Number(data.units) ||
                3,
            }
          : {}),

        ...(data.schedule !==
        undefined
          ? {
              schedule:
                Array.isArray(
                  data.schedule
                )
                  ? data.schedule
                  : [],
            }
          : {}),

        ...(data.links !== undefined
          ? {
              links:
                Array.isArray(
                  data.links
                )
                  ? data.links
                  : [],
            }
          : {}),
      };

      try {
        await updateSubjectInFirestore(
          id,
          updates
        );

        if (
          oldName &&
          nextName &&
          oldName !== nextName
        ) {
          const renameSubject =
            useDeadlinesStore.getState()
              .renameSubject;

          if (
            typeof renameSubject ===
            "function"
          ) {
            await renameSubject(
              oldName,
              nextName
            );
          }
        }

        set({
          firebaseError: false,
          errorMessage: "",
        });
      } catch (error) {
        set({
          firebaseError: true,

          errorMessage:
            getErrorMessage(
              error,
              "Unable to update the subject in Firestore."
            ),
        });

        throw error;
      }
    },

    deleteSubject: async (id) => {
      if (!id) {
        throw new Error(
          "Subject ID is required."
        );
      }

      try {
        await deleteSubjectFromFirestore(
          id
        );

        set({
          firebaseError: false,
          errorMessage: "",
        });
      } catch (error) {
        set({
          firebaseError: true,

          errorMessage:
            getErrorMessage(
              error,
              "Unable to delete the subject from Firestore."
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
  })
);
