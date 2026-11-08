import { useUIStore } from "./useUIStore";
// src/store/useOrganizationsStore.js
import { create } from "zustand";
import {
  subscribeOrganizations,
  addOrganization,
  updateOrganization,
  deleteOrganization,
  fetchOrganizations,
} from "../services/organizationService";

const normalizeType = (value) =>
  String(value || "").trim() === "organization" ? "organization" : "registration";

const normalizeOrganizations = (organizations = []) =>
  organizations
    .filter((organization) => organization?.id && organization?.name?.trim())
    .map((organization) => ({
      ...organization,
      type: normalizeType(organization.type),
      name: String(organization.name || "").trim(),
      description: String(organization.description || "").trim(),
      imageUrl: String(organization.imageUrl || "").trim(),
      googleFormLink: String(organization.googleFormLink || "").trim(),
      facebookLink: String(organization.facebookLink || "").trim(),
      deadline: organization.deadline || null,
    }));

const getErrorMessage = (error, fallback) => error?.message || fallback;

export const useOrganizationsStore = create((set, get) => ({
  organizations: [],
  loading: true,
  firebaseError: false,
  errorMessage: "",

  load: () => {
    set({ loading: true, firebaseError: false, errorMessage: "" });

    const unsubscribe = subscribeOrganizations(
      (firebaseOrganizations) => {
        set({
          organizations: normalizeOrganizations(firebaseOrganizations),
          loading: false,
          firebaseError: false,
          errorMessage: "",
        });
      },
      (error) => {
        set({
          organizations: ["permission-denied", "unauthenticated"].includes(error?.code) ? [] : get().organizations,
          loading: false,
          firebaseError: true,
          errorMessage: getErrorMessage(
            error,
            "Unable to load organizations from Firestore."
          ),
        });
      }
    );

    return typeof unsubscribe === "function" ? unsubscribe : () => {};
  },

  // 🔽 Selectors para sa dalawang klase
  getOrgProfiles: () =>
    get().organizations.filter((org) => org.type === "organization"),

  getRegistrations: () =>
    get().organizations.filter((org) => org.type === "registration"),

  refresh: async () => {
    set({ loading: true, firebaseError: false, errorMessage: "" });
    try {
      const organizations = await fetchOrganizations();
      set({
        organizations: normalizeOrganizations(organizations),
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
          "Unable to refresh organizations from Firestore."
        ),
      });
      throw error;
    }
  },

  addOrganization: async (data) => {
    try {
      const documentReference = await addOrganization(data);
      set({ firebaseError: false, errorMessage: "" });
      useUIStore.getState().celebrateDrumpyy();
      return documentReference;
    } catch (error) {
      set({
        firebaseError: true,
        errorMessage: getErrorMessage(
          error,
          "Unable to add the organization to Firestore."
        ),
      });
      throw error;
    }
  },

  updateOrganization: async (id, data) => {
    try {
      await updateOrganization(id, data);
      set({ firebaseError: false, errorMessage: "" });
    } catch (error) {
      set({
        firebaseError: true,
        errorMessage: getErrorMessage(
          error,
          "Unable to update the organization in Firestore."
        ),
      });
      throw error;
    }
  },

  deleteOrganization: async (id) => {
    try {
      await deleteOrganization(id);
      set({ firebaseError: false, errorMessage: "" });
    } catch (error) {
      set({
        firebaseError: true,
        errorMessage: getErrorMessage(
          error,
          "Unable to delete the organization from Firestore."
        ),
      });
      throw error;
    }
  },

  clearError: () => set({ firebaseError: false, errorMessage: "" }),
}));