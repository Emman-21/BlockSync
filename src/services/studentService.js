import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "./trackedFirestore";
import { db } from "../config/firebase";

const COLLECTION_NAME = "students";
const MIGRATION_BATCH_SIZE = 450;

const studentsCollection = () =>
  collection(db, COLLECTION_NAME);

const normalizeText = (value) => {
  return String(value || "").trim();
};

const getStudentIdentity = (student) => {
  const name = normalizeText(
    student.name
  ).toLowerCase();

  const gender = normalizeText(
    student.gender
  ).toLowerCase();

  return `profile:${name}:${gender}`;
};

const sanitizeStudentData = (
  student = {}
) => {
  return {
    name: normalizeText(student.name),
    gender: normalizeText(
      student.gender
    ),
    isAdmin: Boolean(
      student.isAdmin
    ),
    isFocalPerson: Boolean(
      student.isFocalPerson
    ),
    isClassRep: Boolean(
      student.isClassRep
    ),
  };
};

const sanitizeStudentPatch = (
  data = {}
) => {
  const patch = {};

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "name"
    )
  ) {
    patch.name = normalizeText(
      data.name
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "gender"
    )
  ) {
    patch.gender = normalizeText(
      data.gender
    );
  }

  [
    "isAdmin",
    "isFocalPerson",
    "isClassRep",
  ].forEach((field) => {
    if (
      Object.prototype.hasOwnProperty.call(
        data,
        field
      )
    ) {
      patch[field] = Boolean(
        data[field]
      );
    }
  });

  return patch;
};

export const fetchStudents =
  async () => {
    const snapshot = await getDocs(
      studentsCollection()
    );

    return snapshot.docs.map(
      (studentDocument) => ({
        id: studentDocument.id,
        ...studentDocument.data(),
      })
    );
  };

export const addStudent = async (
  data
) => {
  const sanitizedData =
    sanitizeStudentData(data);

  if (!sanitizedData.name) {
    throw new Error(
      "Student name is required."
    );
  }

  return addDoc(
    studentsCollection(),
    {
      ...sanitizedData,
      createdAt:
        serverTimestamp(),
      updatedAt:
        serverTimestamp(),
    }
  );
};

export const updateStudent = async (
  id,
  data
) => {
  if (!id) {
    throw new Error(
      "Student ID is required."
    );
  }

  const sanitizedData =
    sanitizeStudentPatch(data);

  if (
    Object.prototype.hasOwnProperty.call(
      sanitizedData,
      "name"
    ) &&
    !sanitizedData.name
  ) {
    throw new Error(
      "Student name is required."
    );
  }

  await updateDoc(
    doc(db, COLLECTION_NAME, id),
    {
      ...sanitizedData,

      // Removes the old public field
      // whenever a student is edited.
      studentNumber: deleteField(),

      updatedAt:
        serverTimestamp(),
    }
  );
};

export const removeStudentNumbersFromFirestore =
  async () => {
    const snapshot = await getDocs(
      studentsCollection()
    );

    const documentsWithStudentNumbers =
      snapshot.docs.filter(
        (studentDocument) =>
          Object.prototype.hasOwnProperty.call(
            studentDocument.data(),
            "studentNumber"
          )
      );

    for (
      let startIndex = 0;
      startIndex <
      documentsWithStudentNumbers.length;
      startIndex +=
        MIGRATION_BATCH_SIZE
    ) {
      const batch =
        writeBatch(db);

      const batchDocuments =
        documentsWithStudentNumbers.slice(
          startIndex,
          startIndex +
            MIGRATION_BATCH_SIZE
        );

      batchDocuments.forEach(
        (studentDocument) => {
          batch.update(
            studentDocument.ref,
            {
              studentNumber:
                deleteField(),
              updatedAt:
                serverTimestamp(),
            }
          );
        }
      );

      await batch.commit();
    }

    return {
      removed:
        documentsWithStudentNumbers.length,
    };
  };

export const deleteStudent = async (
  id
) => {
  if (!id) {
    throw new Error(
      "Student ID is required."
    );
  }

  await deleteDoc(
    doc(db, COLLECTION_NAME, id)
  );
};

export const subscribeStudents = (
  callback,
  onError
) => {
  return onSnapshot(
    studentsCollection(),
    (snapshot) => {
      callback(
        snapshot.docs.map(
          (studentDocument) => ({
            id:
              studentDocument.id,
            ...studentDocument.data(),
          })
        )
      );
    },
    (error) => {
      console.error(
        "Unable to subscribe to students:",
        error
      );

      onError?.(error);
    }
  );
};

export const migrateStudentsToFirestore =
  async (localStudents = []) => {
    if (
      !Array.isArray(
        localStudents
      ) ||
      localStudents.length === 0
    ) {
      return {
        migrated: 0,
        skipped: 0,
        total: 0,
      };
    }

    const existingStudents =
      await fetchStudents();

    const knownIdentities =
      new Set(
        existingStudents.map(
          (student) =>
            getStudentIdentity(
              student
            )
        )
      );

    const studentsToMigrate = [];
    let skipped = 0;

    localStudents.forEach(
      (student) => {
        const sanitizedStudent =
          sanitizeStudentData(
            student
          );

        if (
          !sanitizedStudent.name
        ) {
          skipped += 1;
          return;
        }

        const identity =
          getStudentIdentity(
            sanitizedStudent
          );

        if (
          knownIdentities.has(
            identity
          )
        ) {
          skipped += 1;
          return;
        }

        knownIdentities.add(
          identity
        );

        studentsToMigrate.push(
          sanitizedStudent
        );
      }
    );

    for (
      let startIndex = 0;
      startIndex <
      studentsToMigrate.length;
      startIndex +=
        MIGRATION_BATCH_SIZE
    ) {
      const batch =
        writeBatch(db);

      const batchStudents =
        studentsToMigrate.slice(
          startIndex,
          startIndex +
            MIGRATION_BATCH_SIZE
        );

      batchStudents.forEach(
        (student) => {
          const studentReference =
            doc(
              studentsCollection()
            );

          batch.set(
            studentReference,
            {
              ...student,
              createdAt:
                serverTimestamp(),
              updatedAt:
                serverTimestamp(),
            }
          );
        }
      );

      await batch.commit();
    }

    return {
      migrated:
        studentsToMigrate.length,
      skipped,
      total:
        localStudents.length,
    };
  };
