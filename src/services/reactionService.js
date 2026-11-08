import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "./trackedFirestore";
import { db } from "../config/firebase";

const COLLECTION_NAME = "reactions";
const NO_REACTION = "none";

const normalizeText = (value) =>
  String(value || "").trim();

const createReactionId = (
  announcementId,
  actorId
) => {
  const announcementPart =
    encodeURIComponent(
      normalizeText(announcementId)
    );

  const actorPart = encodeURIComponent(
    normalizeText(actorId)
  );

  return `${announcementPart}__${actorPart}`;
};

export const fetchReactions = async (
  announcementId
) => {
  const reactionsQuery = query(
    collection(db, COLLECTION_NAME),
    where(
      "announcementId",
      "==",
      announcementId
    )
  );

  const snapshot = await getDocs(
    reactionsQuery
  );

  return snapshot.docs.map(
    (reactionDocument) => ({
      id: reactionDocument.id,
      ...reactionDocument.data(),
    })
  );
};

export const saveReaction = async ({
  announcementId,
  actorId,
  authorName,
  type,
}) => {
  const normalizedAnnouncementId =
    normalizeText(announcementId);

  const normalizedActorId =
    normalizeText(actorId);

  const normalizedAuthorName =
    normalizeText(authorName);

  const normalizedType =
    normalizeText(type);

  if (
    !normalizedAnnouncementId ||
    !normalizedActorId
  ) {
    throw new Error(
      "Announcement and student identity are required."
    );
  }

  const reactionReference = doc(
    db,
    COLLECTION_NAME,
    createReactionId(
      normalizedAnnouncementId,
      normalizedActorId
    )
  );

  await setDoc(reactionReference, {
    announcementId:
      normalizedAnnouncementId,
    actorId: normalizedActorId,
    authorName:
      normalizedAuthorName || "Student",
    type: normalizedType || NO_REACTION,
    updatedAt: serverTimestamp(),
  });

  return reactionReference;
};

export const clearReaction = async ({
  announcementId,
  actorId,
  authorName,
}) =>
  saveReaction({
    announcementId,
    actorId,
    authorName,
    type: NO_REACTION,
  });

// Used only when an Admin replaces a legacy
// randomly generated reaction.
export const deleteReaction = async (
  id
) => {
  if (!id) {
    return;
  }

  await deleteDoc(
    doc(db, COLLECTION_NAME, id)
  );
};

export const subscribeReactions = (
  announcementId,
  callback,
  onError
) => {
  const reactionsQuery = query(
    collection(db, COLLECTION_NAME),
    where(
      "announcementId",
      "==",
      announcementId
    )
  );

  return onSnapshot(
    reactionsQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map(
          (reactionDocument) => ({
            id: reactionDocument.id,
            ...reactionDocument.data(),
          })
        )
      );
    },
    (error) => {
      console.warn(
        "Reaction listener error:",
        error
      );

      onError?.(error);
    }
  );
};