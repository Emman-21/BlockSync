import { collection, onSnapshot } from "./trackedFirestore";

import { db } from "../config/firebase";

const COLLECTION_NAME = "classroomContents";

const classroomContentsCollection = collection(
  db,
  COLLECTION_NAME
);

const mapClassroomContent = (snapshot) => ({
  id: snapshot.id,
  ...snapshot.data(),
});

export const subscribeClassroomContents = (
  onData,
  onError
) => {
  if (typeof onData !== "function") {
    throw new Error(
      "A Classroom content subscription callback is required."
    );
  }

  return onSnapshot(
    classroomContentsCollection,
    (snapshot) => {
      const contents = snapshot.docs.map(
        mapClassroomContent
      );

      contents.sort((a, b) => {
        const firstDate =
          a.updatedAt ||
          a.createdAt ||
          "";

        const secondDate =
          b.updatedAt ||
          b.createdAt ||
          "";

        return String(secondDate).localeCompare(
          String(firstDate)
        );
      });

      onData(contents);
    },
    (error) => {
      console.error(
        "Classroom content subscription failed:",
        error
      );

      onError?.(error);
    }
  );
};
