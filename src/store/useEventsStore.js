import { useUIStore } from "./useUIStore";
// src/store/useEventsStore.js
import { create } from "zustand";
import {
  subscribeEvents,
  fetchEvents,
  addEvent as addEventToFirestore,
  updateEvent as updateEventInFirestore,
  deleteEvent as deleteEventFromFirestore,
} from "../services/eventService";

const DEFAULT_EVENT = {
  title: "",
  description: "",
  date: "",
  endDate: "",
  emoji: "🔵",
  backgroundColor: "from-blue-500 to-purple-500",
  backgroundImage: "",
  facebookLink: "",
  organizationId: "",
  organizationName: "",
  organizationImageUrl: "",
};

const normalizeEvent = (event = {}) => ({
  ...DEFAULT_EVENT,
  ...event,
  title: String(event.title || "").trim(),
  description: String(event.description || ""),
  date: event.date || "",
  endDate: event.endDate || "",
  emoji: String(event.emoji || "🔵").trim() || "🔵",
  backgroundColor:
    String(event.backgroundColor || "").trim() || DEFAULT_EVENT.backgroundColor,
  backgroundImage: String(event.backgroundImage || "").trim(),
  facebookLink: String(event.facebookLink || "").trim(),
  organizationId: String(event.organizationId || "").trim(),
  organizationName: String(event.organizationName || "").trim(),
  organizationImageUrl: String(event.organizationImageUrl || "").trim(),
});

const normalizeEvents = (events = []) =>
  events.filter((event) => event?.id).map(normalizeEvent);

const getErrorMessage = (error, fallback) => error?.message || fallback;

export const useEventsStore = create((set, get) => ({
  events: [],
  loading: true,
  firebaseError: false,
  errorMessage: "",

  load: () => {
    set({ loading: true, firebaseError: false, errorMessage: "" });
    try {
      const unsubscribe = subscribeEvents(
        (firestoreEvents) => {
          set({
            events: normalizeEvents(firestoreEvents),
            loading: false,
            firebaseError: false,
            errorMessage: "",
          });
        },
        (error) => {
          set({
            events: ["permission-denied", "unauthenticated"].includes(error?.code) ? [] : get().events,
            loading: false,
            firebaseError: true,
            errorMessage: getErrorMessage(
              error,
              "Unable to load events from Firestore."
            ),
          });
        }
      );
      return typeof unsubscribe === "function" ? unsubscribe : () => {};
    } catch (error) {
      set({
        events: ["permission-denied", "unauthenticated"].includes(error?.code) ? [] : get().events,
        loading: false,
        firebaseError: true,
        errorMessage: getErrorMessage(
          error,
          "Unable to connect to the Firestore events collection."
        ),
      });
      return () => {};
    }
  },

  refresh: async () => {
    set({ loading: true, firebaseError: false, errorMessage: "" });
    try {
      const events = await fetchEvents();
      set({
        events: normalizeEvents(events),
        loading: false,
        firebaseError: false,
        errorMessage: "",
      });
    } catch (error) {
      set({
        loading: false,
        firebaseError: true,
        errorMessage: getErrorMessage(
          error,
          "Unable to refresh events from Firestore."
        ),
      });
      throw error;
    }
  },

  getEventById: (id) => get().events.find((event) => event.id === id),

  addEvent: async (data) => {
    const event = normalizeEvent(data);
    if (!event.title) throw new Error("Event title is required.");
    if (!event.date) throw new Error("Event date is required.");

    try {
      const documentReference = await addEventToFirestore(event);
      set({ firebaseError: false, errorMessage: "" });
      useUIStore.getState().celebrateDrumpyy();
      return documentReference;
    } catch (error) {
      set({
        firebaseError: true,
        errorMessage: getErrorMessage(error, "Unable to add the event to Firestore."),
      });
      throw error;
    }
  },

  updateEvent: async (id, data) => {
    if (!id) throw new Error("Event ID is required.");
    try {
      await updateEventInFirestore(id, data);
      set({ firebaseError: false, errorMessage: "" });
    } catch (error) {
      set({
        firebaseError: true,
        errorMessage: getErrorMessage(error, "Unable to update the event in Firestore."),
      });
      throw error;
    }
  },

  deleteEvent: async (id) => {
    if (!id) throw new Error("Event ID is required.");
    try {
      await deleteEventFromFirestore(id);
      set({ firebaseError: false, errorMessage: "" });
    } catch (error) {
      set({
        firebaseError: true,
        errorMessage: getErrorMessage(error, "Unable to delete the event from Firestore."),
      });
      throw error;
    }
  },

  clearError: () => set({ firebaseError: false, errorMessage: "" }),
}));
