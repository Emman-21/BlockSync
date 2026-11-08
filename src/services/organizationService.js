// src/services/organizationService.js
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
} from "./trackedFirestore";
import { db } from "../config/firebase";

const COLLECTION_NAME = "organizations";

const organizationsCollection = () => collection(db, COLLECTION_NAME);

const normalizeText = (value) => String(value || "").trim();

const normalizeType = (value) =>
  normalizeText(value) === "organization" ? "organization" : "registration";

const sanitizeOrganization = (data = {}) => ({
  type: normalizeType(data.type), // ✅ IDINAGDAG
  name: normalizeText(data.name),
  description: normalizeText(data.description),
  imageUrl: normalizeText(data.imageUrl),
  googleFormLink: normalizeText(data.googleFormLink),
  facebookLink: normalizeText(data.facebookLink),
  deadline: normalizeText(data.deadline) || null,
});

const sanitizeOrganizationPatch = (data = {}) => {
  const patch = {};

  if (Object.prototype.hasOwnProperty.call(data, "type")) {
    patch.type = normalizeType(data.type);
  }

  ["name", "description", "imageUrl", "googleFormLink", "facebookLink"].forEach(
    (field) => {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        patch[field] = normalizeText(data[field]);
      }
    }
  );

  if (Object.prototype.hasOwnProperty.call(data, "deadline")) {
    patch.deadline = normalizeText(data.deadline) || null;
  }

  return patch;
};

export const fetchOrganizations = async () => {
  const snapshot = await getDocs(query(organizationsCollection()));
  return snapshot.docs.map((organizationDocument) => ({
    id: organizationDocument.id,
    ...organizationDocument.data(),
  }));
};

export const addOrganization = async (data) => {
  const organization = sanitizeOrganization(data);
  if (!organization.name) throw new Error("Organization name is required.");

  return addDoc(organizationsCollection(), {
    ...organization,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateOrganization = async (id, data) => {
  if (!id) throw new Error("Organization ID is required.");

  const patch = sanitizeOrganizationPatch(data);

  if (Object.prototype.hasOwnProperty.call(patch, "name") && !patch.name) {
    throw new Error("Organization name is required.");
  }

  await updateDoc(doc(db, COLLECTION_NAME, id), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
};

export const deleteOrganization = async (id) => {
  if (!id) throw new Error("Organization ID is required.");
  await deleteDoc(doc(db, COLLECTION_NAME, id));
};

export const subscribeOrganizations = (callback, onError) =>
  onSnapshot(
    query(organizationsCollection()),
    (snapshot) => {
      callback(
        snapshot.docs.map((organizationDocument) => ({
          id: organizationDocument.id,
          ...organizationDocument.data(),
        }))
      );
    },
    (error) => {
      console.error("Unable to subscribe to organizations:", error);
      onError?.(error);
    }
  );