import { useUIStore } from "./useUIStore";
import { create } from "zustand";
import {
  subscribeStudents,
  addStudent,
  updateStudent,
  deleteStudent,
} from "../services/studentService";

const normalizeStudents = (students = []) => {
  return students
    .filter(
      (student) =>
        student?.id &&
        student?.name?.trim()
    )
    .map((student) => ({
      ...student,
      name: student.name.trim(),
      studentNumber: String(
        student.studentNumber || ""
      ).trim(),
      gender: String(
        student.gender || ""
      ).trim(),
      isAdmin: Boolean(student.isAdmin),
      isFocalPerson: Boolean(
        student.isFocalPerson
      ),
      isClassRep: Boolean(
        student.isClassRep
      ),
    }));
};

export const useStudentsStore = create(
  (set, get) => ({
    students: [],
    loading: true,
    firebaseError: false,
    errorMessage: "",

    load: () => {
      set({
        loading: true,
        firebaseError: false,
        errorMessage: "",
      });

      const unsubscribe =
        subscribeStudents(
          (firebaseStudents) => {
            set({
              students:
                normalizeStudents(
                  firebaseStudents
                ),
              loading: false,
              firebaseError: false,
              errorMessage: "",
            });
          },
          (error) => {
            set({
              students: ["permission-denied", "unauthenticated"].includes(error?.code) ? [] : get().students,
              loading: false,
              firebaseError: true,
              errorMessage:
                error?.message ||
                "Unable to load the student roster from Firestore.",
            });
          }
        );

      return typeof unsubscribe ===
        "function"
        ? unsubscribe
        : () => {};
    },

    addStudent: async (
      name,
      gender,
      additionalData = {}
    ) => {
      const normalizedName = String(
        name || ""
      ).trim();

      if (!normalizedName) {
        throw new Error(
          "Student name is required."
        );
      }

      const newStudent = {
        ...additionalData,
        name: normalizedName,
        gender,
        studentNumber: String(
          additionalData.studentNumber || ""
        ).trim(),
        isAdmin: Boolean(
          additionalData.isAdmin
        ),
        isFocalPerson: Boolean(
          additionalData.isFocalPerson
        ),
        isClassRep: Boolean(
          additionalData.isClassRep
        ),
      };

      try {
        const documentReference =
          await addStudent(newStudent);

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
            error?.message ||
            "Unable to add the student to Firestore.",
        });

        throw error;
      }
    },

    updateStudent: async (
      id,
      data
    ) => {
      if (!id) {
        throw new Error(
          "Student ID is required."
        );
      }

      try {
        await updateStudent(id, data);

        set({
          firebaseError: false,
          errorMessage: "",
        });
      } catch (error) {
        set({
          firebaseError: true,
          errorMessage:
            error?.message ||
            "Unable to update the student in Firestore.",
        });

        throw error;
      }
    },

    deleteStudent: async (id) => {
      if (!id) {
        throw new Error(
          "Student ID is required."
        );
      }

      try {
        await deleteStudent(id);

        set({
          firebaseError: false,
          errorMessage: "",
        });
      } catch (error) {
        set({
          firebaseError: true,
          errorMessage:
            error?.message ||
            "Unable to delete the student from Firestore.",
        });

        throw error;
      }
    },

    seedDefaultStudents:
      async () => {
        const defaults = [
          {
            name: "Juan Dela Cruz",
            gender: "male",
          },
          {
            name: "Maria Santos",
            gender: "female",
          },
          {
            name: "Jose Garcia",
            gender: "male",
          },
          {
            name: "Ana Reyes",
            gender: "female",
          },
          {
            name: "Pedro Lopez",
            gender: "male",
          },
        ];

        for (const student of defaults) {
          await get().addStudent(
            student.name,
            student.gender
          );
        }
      },
  })
);