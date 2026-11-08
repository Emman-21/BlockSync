// src/services/eventService.js
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

const COLLECTION_NAME = "events";

const eventsCollection = () => collection(db, COLLECTION_NAME);

const normalizeText = (value) => String(value ?? "").trim();

const removeUndefinedValues = (data) =>
  Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );

const mapEventDocument = (snapshot) => ({
  id: snapshot.id,
  ...snapshot.data(),
});

const sanitizeEvent = (data = {}) => ({
  title: normalizeText(data.title),
  description: String(data.description ?? ""),
  date: data.date || "",
  endDate: data.endDate || "",
  emoji: normalizeText(data.emoji) || "🔵",
  backgroundColor:
    normalizeText(data.backgroundColor) || "from-blue-500 to-purple-500",
  backgroundImage: normalizeText(data.backgroundImage),
  facebookLink: normalizeText(data.facebookLink),
  // 🔽 Organization (optional)
  organizationId: normalizeText(data.organizationId),
  organizationName: normalizeText(data.organizationName),
  organizationImageUrl: normalizeText(data.organizationImageUrl),
});

const sanitizeEventPatch = (data = {}) => {
  const patch = { ...data };

  delete patch.id;
  delete patch.createdAt;
  delete patch.updatedAt;

  const textFields = [
    "title",
    "emoji",
    "backgroundColor",
    "backgroundImage",
    "facebookLink",
    "organizationId",
    "organizationName",
    "organizationImageUrl",
  ];

  textFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      if (field === "title" || field === "emoji" || field === "backgroundColor") {
        patch[field] =
          normalizeText(data[field]) ||
          (field === "emoji"
            ? "🔵"
            : field === "backgroundColor"
            ? "from-blue-500 to-purple-500"
            : "");
      } else {
        patch[field] = normalizeText(data[field]);
      }
    }
  });

  if (Object.prototype.hasOwnProperty.call(data, "description")) {
    patch.description = String(data.description ?? "");
  }

  if (Object.prototype.hasOwnProperty.call(data, "date")) {
    patch.date = data.date || "";
  }

  return removeUndefinedValues(patch);
};

export const fetchEvents = async () => {
  const snapshot = await getDocs(eventsCollection());
  return snapshot.docs.map(mapEventDocument);
};

export const addEvent = async (data) => {
  const event = sanitizeEvent(data);

  if (!event.title) throw new Error("Event title is required.");
  if (!event.date) throw new Error("Event date is required.");

  return addDoc(eventsCollection(), {
    ...event,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateEvent = async (id, data) => {
  const eventId = normalizeText(id);
  if (!eventId) throw new Error("Event ID is required.");

  const updates = sanitizeEventPatch(data);

  if (Object.prototype.hasOwnProperty.call(updates, "title") && !updates.title) {
    throw new Error("Event title is required.");
  }
  if (Object.prototype.hasOwnProperty.call(updates, "date") && !updates.date) {
    throw new Error("Event date is required.");
  }

  await updateDoc(doc(db, COLLECTION_NAME, eventId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const deleteEvent = async (id) => {
  const eventId = normalizeText(id);
  if (!eventId) throw new Error("Event ID is required.");
  await deleteDoc(doc(db, COLLECTION_NAME, eventId));
};

export const subscribeEvents = (callback, onError) => {
  if (typeof callback !== "function") {
    throw new Error("An event subscription callback is required.");
  }

  return onSnapshot(
    eventsCollection(),
    (snapshot) => {
      callback(snapshot.docs.map(mapEventDocument));
    },
    (error) => {
      console.error("Event subscription failed:", error);
      onError?.(error);
    }
  );
};
