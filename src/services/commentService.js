import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "./trackedFirestore";
import { db } from "../config/firebase";

const COLLECTION_NAME = "comments";

const normalizeText = (value) =>
  String(value || "").trim();

const sortComments = (comments) =>
  [...comments].sort((first, second) => {
    const firstDate =
      first.timestamp?.toDate?.() ||
      new Date(first.timestamp || 0);

    const secondDate =
      second.timestamp?.toDate?.() ||
      new Date(second.timestamp || 0);

    return (
      firstDate.getTime() -
      secondDate.getTime()
    );
  });

export const fetchComments = async (
  announcementId
) => {
  const normalizedAnnouncementId =
    normalizeText(announcementId);

  if (!normalizedAnnouncementId) {
    return [];
  }

  const commentsQuery = query(
    collection(db, COLLECTION_NAME),
    where(
      "announcementId",
      "==",
      normalizedAnnouncementId
    )
  );

  const snapshot = await getDocs(
    commentsQuery
  );

  return sortComments(
    snapshot.docs.map(
      (commentDocument) => ({
        id: commentDocument.id,
        ...commentDocument.data(),
      })
    )
  );
};

export const addComment = async ({
  announcementId,
  actorId,
  authorName,
  content,
}) => {
  const normalizedAnnouncementId =
    normalizeText(announcementId);

  const normalizedActorId =
    normalizeText(actorId);

  const normalizedAuthorName =
    normalizeText(authorName);

  const normalizedContent =
    normalizeText(content);

  if (
    !normalizedAnnouncementId ||
    !normalizedActorId ||
    !normalizedAuthorName ||
    !normalizedContent
  ) {
    throw new Error(
      "Announcement, user identity, and comment are required."
    );
  }

  if (normalizedContent.length > 500) {
    throw new Error(
      "Comments can contain up to 500 characters only."
    );
  }

  return addDoc(
    collection(db, COLLECTION_NAME),
    {
      announcementId:
        normalizedAnnouncementId,
      actorId: normalizedActorId,
      authorName: normalizedAuthorName,
      content: normalizedContent,
      timestamp: serverTimestamp(),
    }
  );
};

export const deleteComment = async (
  id
) => {
  const normalizedId = normalizeText(id);

  if (!normalizedId) {
    throw new Error(
      "Comment ID is required."
    );
  }

  await deleteDoc(
    doc(db, COLLECTION_NAME, normalizedId)
  );
};

export const subscribeComments = (
  announcementId,
  callback,
  onError
) => {
  const normalizedAnnouncementId =
    normalizeText(announcementId);

  if (!normalizedAnnouncementId) {
    callback([]);
    return () => {};
  }

  const commentsQuery = query(
    collection(db, COLLECTION_NAME),
    where(
      "announcementId",
      "==",
      normalizedAnnouncementId
    )
  );

  return onSnapshot(
    commentsQuery,
    (snapshot) => {
      const comments =
        snapshot.docs.map(
          (commentDocument) => ({
            id: commentDocument.id,
            ...commentDocument.data(),
          })
        );

      callback(sortComments(comments));
    },
    (error) => {
      console.warn(
        "Comment listener error:",
        error
      );

      onError?.(error);
    }
  );
};