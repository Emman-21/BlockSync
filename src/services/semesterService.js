import {
  collection,
  doc,
  serverTimestamp,
} from "./trackedFirestore";
import {
  addDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
} from "./trackedFirestore";
import { db } from "../config/firebase";

const SEMESTERS = "semesters";
const SETTINGS = "systemSettings";
const ACADEMIC_SETTINGS_ID = "academic";

const clean = (value) => String(value ?? "").trim();

export const subscribeSemesters = (onData, onError) =>
  onSnapshot(
    collection(db, SEMESTERS),
    (snapshot) => {
      const semesters = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort((a, b) => String(b.createdAt?.seconds ?? "").localeCompare(
          String(a.createdAt?.seconds ?? "")
        ));
      onData(semesters);
    },
    onError
  );

export const createSemester = async ({ name, schoolYear }) => {
  const semesterName = clean(name);
  const year = clean(schoolYear);

  if (!semesterName || !year) {
    throw new Error("Semester name and school year are required.");
  }

  return addDoc(collection(db, SEMESTERS), {
    name: semesterName,
    schoolYear: year,
    status: "inactive",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const activateSemester = async (semesterId) => {
  const id = clean(semesterId);
  if (!id) throw new Error("Select a semester first.");

  const snapshot = await getDocs(collection(db, SEMESTERS));
  await Promise.all(
    snapshot.docs.map((item) =>
      updateDoc(item.ref, {
        status:
          item.id === id
            ? "active"
            : item.data().status === "archived"
            ? "archived"
            : "inactive",
        updatedAt: serverTimestamp(),
      })
    )
  );

  await setDoc(
    doc(db, SETTINGS, ACADEMIC_SETTINGS_ID),
    { activeSemesterId: id, updatedAt: serverTimestamp() },
    { merge: true }
  );
};

export const archiveSemester = async (semesterId) => {
  const id = clean(semesterId);
  if (!id) throw new Error("Semester ID is required.");

  await updateDoc(doc(db, SEMESTERS, id), {
    status: "archived",
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const subjects = await getDocs(collection(db, "subjects"));
  await Promise.all(
    subjects.docs
      .filter((item) => item.data().semesterId === id)
      .map((item) =>
        updateDoc(item.ref, {
          archived: true,
          updatedAt: serverTimestamp(),
        })
      )
  );
};
