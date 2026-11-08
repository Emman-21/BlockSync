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

import { db } from "../config/firebase";

const COLLECTION_NAME = "deadlines";

const deadlinesCollection = collection(
  db,
  COLLECTION_NAME
);

// Do not order by dueDate in Firestore. An orderBy query excludes
// documents that do not contain the field, including activities with
// no fixed deadline. Sorting is handled safely in the store/UI.
const deadlinesQuery = deadlinesCollection;

const removeUndefinedValues = (data) => {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([, value]) => value !== undefined
    )
  );
};

const mapDeadlineDocument = (snapshot) => ({
  id: snapshot.id,
  ...snapshot.data(),
});

export const fetchDeadlines = async () => {
  const snapshot = await getDocs(deadlinesQuery);

  return snapshot.docs.map(
    mapDeadlineDocument
  );
};

export const addDeadline = async (data) => {
  const deadline = removeUndefinedValues({
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return addDoc(
    deadlinesCollection,
    deadline
  );
};

export const updateDeadline = async (
  id,
  data
) => {
  if (!id) {
    throw new Error(
      "A deadline ID is required before updating."
    );
  }

  const updates = removeUndefinedValues({
    ...data,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(
    doc(db, COLLECTION_NAME, id),
    updates
  );
};

export const deleteDeadline = async (id) => {
  if (!id) {
    throw new Error(
      "A deadline ID is required before deleting."
    );
  }

  await deleteDoc(
    doc(db, COLLECTION_NAME, id)
  );
};

export const subscribeDeadlines = (
  onData,
  onError
) => {
  if (typeof onData !== "function") {
    throw new Error(
      "A deadline subscription callback is required."
    );
  }

  return onSnapshot(
    deadlinesQuery,
    (snapshot) => {
      onData(
        snapshot.docs.map(
          mapDeadlineDocument
        )
      );
    },
    (error) => {
      console.error(
        "Deadline subscription failed:",
        error
      );

      onError?.(error);
    }
  );
};
