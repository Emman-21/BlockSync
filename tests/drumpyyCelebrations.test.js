import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../src/services/deadlineService", () => ({ subscribeDeadlines: vi.fn(), addDeadline: vi.fn(), updateDeadline: vi.fn(), deleteDeadline: vi.fn() }));
vi.mock("../src/services/announcementService", () => ({ subscribeAnnouncements: vi.fn(), addAnnouncement: vi.fn(), updateAnnouncement: vi.fn(), deleteAnnouncement: vi.fn(), togglePin: vi.fn(), fetchAnnouncements: vi.fn() }));
import { addDeadline } from "../src/services/deadlineService";
import { addAnnouncement } from "../src/services/announcementService";
import { useDeadlinesStore } from "../src/store/useDeadlinesStore";
import { useAnnouncementsStore } from "../src/store/useAnnouncementsStore";
import { useUIStore } from "../src/store/useUIStore";
beforeEach(() => { vi.clearAllMocks(); useUIStore.setState({ drumpyyPose: "idle", drumpyyCelebrationPending: false, drumpyyCelebrationId: 0 }); });
describe("Drumpyy celebrates confirmed local additions", () => {
  for (const [name, service, store, action] of [
    ["deadline", addDeadline, useDeadlinesStore, "addDeadline"],
    ["announcement", addAnnouncement, useAnnouncementsStore, "addAnnouncement"],
  ]) {
    it(name + " celebrates only after the save resolves", async () => {
      let finish;
      service.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
      const saving = store.getState()[action]({ title: "Test item", noFixedDeadline: true });
      expect(useUIStore.getState().drumpyyPose).toBe("idle");
      finish({ id: "saved" });
      await expect(saving).resolves.toEqual({ id: "saved" });
      expect(useUIStore.getState().drumpyyPose).toBe("celebrating");
    });
    it(name + " does not celebrate a failed save", async () => {
      service.mockRejectedValueOnce(new Error("Save failed"));
      await expect(store.getState()[action]({ title: "Test item", noFixedDeadline: true })).rejects.toThrow("Save failed");
      expect(useUIStore.getState().drumpyyPose).toBe("idle");
    });
  }
});
