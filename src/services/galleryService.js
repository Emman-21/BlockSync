import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "./trackedFirestore";
import { db } from "../config/firebase";

const COLLECTION_NAME = "gallery_albums";

const albumsCollection = () =>
  collection(db, COLLECTION_NAME);

const albumsQuery = () =>
  query(
    albumsCollection(),
    orderBy("createdAt", "desc")
  );

const normalizeText = (value) =>
  String(value || "").trim();

const sanitizeAlbum = (data = {}) => ({
  title: normalizeText(data.title),
  description: normalizeText(
    data.description
  ),
  coverImage: normalizeText(
    data.coverImage
  ),
  createdBy: normalizeText(data.createdBy),
  createdByName: normalizeText(data.createdByName),
  photos: Array.isArray(data.photos)
    ? data.photos
    : [],
});

const sanitizeAlbumPatch = (data = {}) => {
  const patch = {};

  [
    "title",
    "description",
    "coverImage",
  ].forEach((field) => {
    if (
      Object.prototype.hasOwnProperty.call(
        data,
        field
      )
    ) {
      patch[field] = normalizeText(
        data[field]
      );
    }
  });

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "photos"
    )
  ) {
    patch.photos = Array.isArray(
      data.photos
    )
      ? data.photos
      : [];
  }

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "deletedPhoto"
    )
  ) {
    patch.deletedPhoto = data.deletedPhoto || null;
  }

  return patch;
};

export const fetchAlbums = async () => {
  const snapshot = await getDocs(
    albumsQuery()
  );

  return snapshot.docs.map(
    (albumDocument) => ({
      id: albumDocument.id,
      ...albumDocument.data(),
    })
  );
};

export const addAlbum = async (data) => {
  const album = sanitizeAlbum(data);

  if (!album.title) {
    throw new Error(
      "Album title is required."
    );
  }

  return addDoc(albumsCollection(), {
    ...album,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateAlbum = async (
  id,
  data
) => {
  if (!id) {
    throw new Error(
      "Album ID is required."
    );
  }

  const patch = sanitizeAlbumPatch(data);

  if (
    Object.prototype.hasOwnProperty.call(
      patch,
      "title"
    ) &&
    !patch.title
  ) {
    throw new Error(
      "Album title is required."
    );
  }

  await updateDoc(
    doc(db, COLLECTION_NAME, id),
    {
      ...patch,
      updatedAt: serverTimestamp(),
    }
  );
};

export const deleteAlbum = async (id) => {
  if (!id) {
    throw new Error(
      "Album ID is required."
    );
  }

  await deleteDoc(
    doc(db, COLLECTION_NAME, id)
  );
};

export const subscribeAlbums = (
  callback,
  onError
) =>
  onSnapshot(
    albumsQuery(),
    (snapshot) => {
      callback(
        snapshot.docs.map(
          (albumDocument) => ({
            id: albumDocument.id,
            ...albumDocument.data(),
          })
        )
      );
    },
    (error) => {
      console.error(
        "Unable to subscribe to gallery albums:",
        error
      );

      onError?.(error);
    }
  );
