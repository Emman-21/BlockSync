import { useUIStore } from "./useUIStore";
import { create } from "zustand";
import {
  subscribeAlbums,
  addAlbum,
  updateAlbum,
  deleteAlbum,
  fetchAlbums,
} from "../services/galleryService";

const normalizeAlbums = (albums = []) =>
  albums
    .filter(
      (album) =>
        album?.id &&
        album?.title?.trim()
    )
    .map((album) => ({
      ...album,
      title: String(
        album.title || ""
      ).trim(),
      description: String(
        album.description || ""
      ).trim(),
      coverImage: String(
        album.coverImage || ""
      ).trim(),
      createdBy: String(
        album.createdBy || ""
      ).trim(),
      createdByName: String(
        album.createdByName || ""
      ).trim(),
      photos: Array.isArray(album.photos)
        ? album.photos
        : [],
    }));

const getErrorMessage = (
  error,
  fallback
) => error?.message || fallback;

export const useGalleryStore = create(
  (set, get) => ({
    albums: [],
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
        subscribeAlbums(
          (firebaseAlbums) => {
            set({
              albums:
                normalizeAlbums(
                  firebaseAlbums
                ),
              loading: false,
              firebaseError: false,
              errorMessage: "",
            });
          },
          (error) => {
            set({
              albums: ["permission-denied", "unauthenticated"].includes(error?.code) ? [] : get().albums,
              loading: false,
              firebaseError: true,
              errorMessage:
                getErrorMessage(
                  error,
                  "Unable to load gallery albums from Firestore."
                ),
            });
          }
        );

      return typeof unsubscribe ===
        "function"
        ? unsubscribe
        : () => {};
    },

    refresh: async () => {
      set({
        loading: true,
        firebaseError: false,
        errorMessage: "",
      });

      try {
        const albums =
          await fetchAlbums();

        set({
          albums:
            normalizeAlbums(albums),
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
              "Unable to refresh gallery albums from Firestore."
            ),
        });

        throw error;
      }
    },

    getAlbumById: (id) =>
      get().albums.find(
        (album) => album.id === id
      ),

    addAlbum: async (data) => {
      try {
        const documentReference =
          await addAlbum(data);

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
              "Unable to add the album to Firestore."
            ),
        });

        throw error;
      }
    },

    updateAlbum: async (
      id,
      data
    ) => {
      try {
        await updateAlbum(id, data);

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
              "Unable to update the album in Firestore."
            ),
        });

        throw error;
      }
    },

    deleteAlbum: async (id) => {
      try {
        await deleteAlbum(id);

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
              "Unable to delete the album from Firestore."
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