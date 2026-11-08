import { create } from "zustand";

import {
  subscribeClassroomContents,
} from "../services/classroomContentService";

export const useClassroomContentsStore = create(
  (set, get) => ({
    contents: [],
    loading: false,
    error: null,
    unsubscribe: null,

    load: () => {
      const currentUnsubscribe = get().unsubscribe;

      if (currentUnsubscribe) {
        return currentUnsubscribe;
      }

      set({
        loading: true,
        error: null,
      });

      const unsubscribeFromFirestore = subscribeClassroomContents(
        (contents) => {
          set({
            contents,
            loading: false,
            error: null,
          });
        },
        (error) => {
          set({
            contents: ["permission-denied", "unauthenticated"].includes(error?.code) ? [] : get().contents,
            loading: false,
            error:
              error?.message ||
              "Unable to load Google Classroom content.",
          });
        }
      );

      const unsubscribe = () => {
        unsubscribeFromFirestore?.();
        if (get().unsubscribe === unsubscribe) {
          set({ unsubscribe: null });
        }
      };

      set({ unsubscribe });

      return unsubscribe;
    },

    stop: () => {
      const unsubscribe = get().unsubscribe;

      if (unsubscribe) {
        unsubscribe();
      }

      set({ unsubscribe: null });
    },

    getForSubject: (subjectName) => {
      const normalizedSubjectName = String(
        subjectName || ""
      )
        .trim()
        .toLowerCase();

      return get().contents.filter(
        (content) =>
          String(content.subjectName || "")
            .trim()
            .toLowerCase() === normalizedSubjectName
      );
    },
  })
);
