import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "./trackedFirestore";

import {
  db,
} from "../config/firebase";

const COLLECTION_NAME =
  "announcements";

const announcementsCollection =
  () =>
    collection(
      db,
      COLLECTION_NAME
    );

const normalizeText = (
  value
) =>
  String(
    value ?? ""
  ).trim();

const removeUndefinedValues = (
  data
) =>
  Object.fromEntries(
    Object.entries(
      data
    ).filter(
      ([, value]) =>
        value !== undefined
    )
  );

const mapAnnouncementDocument = (
  snapshot
) => ({
  id: snapshot.id,
  ...snapshot.data(),
});

const sanitizeAnnouncement = (
  data = {}
) => ({
  title: normalizeText(
    data.title
  ),

  description: String(
    data.description ?? ""
  ),

  subjectName: normalizeText(
    data.subjectName
  ),

  authorName:
    normalizeText(
      data.authorName
    ) || "Admin",

  pinned: Boolean(
    data.pinned
  ),

  attachments:
    Array.isArray(
      data.attachments
    )
      ? data.attachments
      : [],

  imageUrl: data.imageUrl
    ? normalizeText(
        data.imageUrl
      )
    : null,

  images: Array.isArray(data.images)
    ? data.images
        .filter((image) => image?.url)
        .slice(0, 10)
        .map((image, index) => ({
          url: normalizeText(image.url),
          publicId: normalizeText(image.publicId),
          width: Number(image.width) || null,
          height: Number(image.height) || null,
          order: index,
        }))
    : [],

  expiryDate:
    data.expiryDate ||
    null,
});

const sanitizeAnnouncementPatch = (
  data = {}
) => {
  const patch = {
    ...data,
  };

  delete patch.id;
  delete patch.datePosted;
  delete patch.createdAt;
  delete patch.updatedAt;

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "subjectName"
    )
  ) {
    patch.subjectName = normalizeText(data.subjectName);
  }

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "title"
    )
  ) {
    patch.title =
      normalizeText(
        data.title
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "description"
    )
  ) {
    patch.description =
      String(
        data.description ??
          ""
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "authorName"
    )
  ) {
    patch.authorName =
      normalizeText(
        data.authorName
      ) || "Admin";
  }

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "pinned"
    )
  ) {
    patch.pinned =
      Boolean(
        data.pinned
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "attachments"
    )
  ) {
    patch.attachments =
      Array.isArray(
        data.attachments
      )
        ? data.attachments
        : [];
  }

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "imageUrl"
    )
  ) {
    patch.imageUrl =
      data.imageUrl
        ? normalizeText(
            data.imageUrl
          )
        : null;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "images"
    )
  ) {
    patch.images = Array.isArray(data.images)
      ? data.images
          .filter((image) => image?.url)
          .slice(0, 10)
          .map((image, index) => ({
            url: normalizeText(image.url),
            publicId: normalizeText(image.publicId),
            width: Number(image.width) || null,
            height: Number(image.height) || null,
            order: index,
          }))
      : [];
  }

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "expiryDate"
    )
  ) {
    patch.expiryDate =
      data.expiryDate ||
      null;
  }

  return removeUndefinedValues(
    patch
  );
};

export const fetchAnnouncements =
  async () => {
    const snapshot =
      await getDocs(
        announcementsCollection()
      );

    return snapshot.docs.map(
      mapAnnouncementDocument
    );
  };

export const addAnnouncement =
  async (data) => {
    const announcement =
      sanitizeAnnouncement(
        data
      );

    if (
      !announcement.title
    ) {
      throw new Error(
        "Announcement title is required."
      );
    }

    return addDoc(
      announcementsCollection(),
      {
        ...announcement,

        datePosted:
          serverTimestamp(),

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),
      }
    );
  };

export const updateAnnouncement =
  async (
    id,
    data
  ) => {
    const announcementId =
      normalizeText(id);

    if (
      !announcementId
    ) {
      throw new Error(
        "Announcement ID is required."
      );
    }

    const updates =
      sanitizeAnnouncementPatch(
        data
      );

    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        "title"
      ) &&
      !updates.title
    ) {
      throw new Error(
        "Announcement title is required."
      );
    }

    await updateDoc(
      doc(
        db,
        COLLECTION_NAME,
        announcementId
      ),
      {
        ...updates,

        updatedAt:
          serverTimestamp(),
      }
    );
  };

export const deleteAnnouncement =
  async (id) => {
    const announcementId =
      normalizeText(id);

    if (
      !announcementId
    ) {
      throw new Error(
        "Announcement ID is required."
      );
    }

    await deleteDoc(
      doc(
        db,
        COLLECTION_NAME,
        announcementId
      )
    );
  };

export const togglePin =
  async (
    id,
    pinned
  ) => {
    const announcementId =
      normalizeText(id);

    if (
      !announcementId
    ) {
      throw new Error(
        "Announcement ID is required."
      );
    }

    await updateDoc(
      doc(
        db,
        COLLECTION_NAME,
        announcementId
      ),
      {
        pinned:
          Boolean(pinned),

        updatedAt:
          serverTimestamp(),
      }
    );
  };

export const subscribeAnnouncements =
  (
    callback,
    onError
  ) => {
    if (
      typeof callback !==
      "function"
    ) {
      throw new Error(
        "An announcement subscription callback is required."
      );
    }

    return onSnapshot(
      announcementsCollection(),

      (snapshot) => {
        callback(
          snapshot.docs.map(
            mapAnnouncementDocument
          )
        );
      },

      (error) => {
        console.error(
          "Announcement subscription failed:",
          error
        );

        onError?.(error);
      }
    );
  };
