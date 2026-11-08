import { useUIStore } from "./useUIStore";
import { create } from "zustand";
import { isPast, isToday } from "date-fns";
import {
  subscribeAnnouncements,
  addAnnouncement as addAnnouncementToFirestore,
  updateAnnouncement as updateAnnouncementInFirestore,
  deleteAnnouncement as deleteAnnouncementFromFirestore,
  togglePin as togglePinInFirestore,
  fetchAnnouncements,
} from "../services/announcementService";

const DEFAULT_ANNOUNCEMENT = {
  title: "",
  description: "",
  authorName: "Admin",
  pinned: false,
  attachments: [],
  imageUrl: null,
  images: [],
  subjectName: "",
  expiryDate: null,
  datePosted: null,
};

const toDate = (value) => {
  if (!value) return null;

  if (
    typeof value.toDate === "function"
  ) {
    return value.toDate();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
};

const isExpired = (
  announcement
) => {
  if (
    announcement.pinned ||
    !announcement.expiryDate
  ) {
    return false;
  }

  const expiryDate = toDate(
    announcement.expiryDate
  );

  return expiryDate
    ? isPast(expiryDate) && !isToday(expiryDate)
    : false;
};

const normalizeAnnouncement = (
  announcement = {}
) => ({
  ...DEFAULT_ANNOUNCEMENT,
  ...announcement,

  title: String(
    announcement.title || ""
  ).trim(),

  description: String(
    announcement.description || ""
  ),

  authorName:
    String(
      announcement.authorName ||
        "Admin"
    ).trim() || "Admin",

  pinned: Boolean(
    announcement.pinned
  ),

  attachments: Array.isArray(
    announcement.attachments
  )
    ? announcement.attachments
    : [],

  imageUrl: announcement.imageUrl
    ? String(
        announcement.imageUrl
      ).trim()
    : null,

  images: Array.isArray(announcement.images) && announcement.images.length
    ? announcement.images.filter((image) => image?.url).slice(0, 10)
    : announcement.imageUrl
      ? [{ url: String(announcement.imageUrl).trim(), order: 0 }]
      : [],

  subjectName: String(announcement.subjectName || "").trim(),

  expiryDate:
    announcement.expiryDate || null,

  datePosted:
    announcement.datePosted ||
    announcement.createdAt ||
    null,
});

const sortAnnouncements = (
  announcements = []
) =>
  [...announcements].sort(
    (first, second) => {
      if (
        first.pinned !==
        second.pinned
      ) {
        return first.pinned
          ? -1
          : 1;
      }

      const firstExpired =
        isExpired(first);

      const secondExpired =
        isExpired(second);

      if (
        firstExpired !==
        secondExpired
      ) {
        return firstExpired
          ? 1
          : -1;
      }

      const firstDate =
        toDate(
          first.datePosted
        )?.getTime() || 0;

      const secondDate =
        toDate(
          second.datePosted
        )?.getTime() || 0;

      return (
        secondDate - firstDate
      );
    }
  );

const normalizeAnnouncements = (
  announcements = []
) =>
  sortAnnouncements(
    announcements
      .filter(
        (announcement) =>
          announcement?.id
      )
      .map(
        normalizeAnnouncement
      )
  );

const getErrorMessage = (
  error,
  fallback
) => error?.message || fallback;

export const useAnnouncementsStore =
  create((set, get) => ({
    announcements: [],
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
          subscribeAnnouncements(
            (
              firestoreAnnouncements
            ) => {
              set({
                announcements:
                  normalizeAnnouncements(
                    firestoreAnnouncements
                  ),

                loading: false,
                firebaseError: false,
                errorMessage: "",
              });
            },

            (error) => {
              set({
                announcements: ["permission-denied", "unauthenticated"].includes(error?.code) ? [] : get().announcements,
                loading: false,
                firebaseError: true,

                errorMessage:
                  getErrorMessage(
                    error,
                    "Unable to load announcements from Firestore."
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
          announcements: ["permission-denied", "unauthenticated"].includes(error?.code) ? [] : get().announcements,
          loading: false,
          firebaseError: true,

          errorMessage:
            getErrorMessage(
              error,
              "Unable to connect to the Firestore announcements collection."
            ),
        });

        return () => {};
      }
    },

    refresh: async () => {
      set({
        loading: true,
        firebaseError: false,
        errorMessage: "",
      });

      try {
        const announcements =
          await fetchAnnouncements();

        set({
          announcements:
            normalizeAnnouncements(
              announcements
            ),

          loading: false,
          firebaseError: false,
          errorMessage: "",
        });
      } catch (error) {
        set({
          loading: false,
          firebaseError: true,

          errorMessage:
            getErrorMessage(
              error,
              "Unable to refresh announcements from Firestore."
            ),
        });

        throw error;
      }
    },

    addAnnouncement: async (
      data
    ) => {
      const announcement =
        normalizeAnnouncement(data);

      if (!announcement.title) {
        throw new Error(
          "Announcement title is required."
        );
      }

      try {
        const documentReference =
          await addAnnouncementToFirestore(
            {
              title:
                announcement.title,

              description:
                announcement.description,

              authorName:
                announcement.authorName,

              pinned:
                announcement.pinned,

              attachments:
                announcement.attachments,

              imageUrl:
                announcement.imageUrl,

              images:
                announcement.images,

              subjectName:
                announcement.subjectName,

              expiryDate:
                announcement.expiryDate,
            }
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
              "Unable to add the announcement to Firestore."
            ),
        });

        throw error;
      }
    },

    updateAnnouncement: async (
      id,
      data
    ) => {
      if (!id) {
        throw new Error(
          "Announcement ID is required."
        );
      }

      const updates = {
        ...data,

        ...(data.title !==
        undefined
          ? {
              title: String(
                data.title || ""
              ).trim(),
            }
          : {}),

        ...(data.description !==
        undefined
          ? {
              description: String(
                data.description ||
                  ""
              ),
            }
          : {}),

        ...(data.authorName !==
        undefined
          ? {
              authorName:
                String(
                  data.authorName ||
                    "Admin"
                ).trim() ||
                "Admin",
            }
          : {}),

        ...(data.pinned !==
        undefined
          ? {
              pinned: Boolean(
                data.pinned
              ),
            }
          : {}),

        ...(data.attachments !==
        undefined
          ? {
              attachments:
                Array.isArray(
                  data.attachments
                )
                  ? data.attachments
                  : [],
            }
          : {}),

        ...(data.imageUrl !==
        undefined
          ? {
              imageUrl:
                data.imageUrl
                  ? String(
                      data.imageUrl
                    ).trim()
                  : null,
            }
          : {}),

        ...(data.images !== undefined
          ? {
              images: Array.isArray(data.images)
                ? data.images.filter((image) => image?.url).slice(0, 10)
                : [],
            }
          : {}),

        ...(data.subjectName !== undefined
          ? {
              subjectName: String(data.subjectName || "").trim(),
            }
          : {}),

        ...(data.expiryDate !==
        undefined
          ? {
              expiryDate:
                data.expiryDate ||
                null,
            }
          : {}),
      };

      if (
        data.title !== undefined &&
        !updates.title
      ) {
        throw new Error(
          "Announcement title is required."
        );
      }

      try {
        await updateAnnouncementInFirestore(
          id,
          updates
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
              "Unable to update the announcement in Firestore."
            ),
        });

        throw error;
      }
    },

    deleteAnnouncement:
      async (id) => {
        if (!id) {
          throw new Error(
            "Announcement ID is required."
          );
        }

        try {
          await deleteAnnouncementFromFirestore(
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
                "Unable to delete the announcement from Firestore."
              ),
          });

          throw error;
        }
      },

    togglePin: async (
      id,
      pinned
    ) => {
      if (!id) {
        throw new Error(
          "Announcement ID is required."
        );
      }

      try {
        await togglePinInFirestore(
          id,
          Boolean(pinned)
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
              "Unable to update the announcement pin in Firestore."
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
