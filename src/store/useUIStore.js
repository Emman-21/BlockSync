import { create } from "zustand";
import { assistantPoseReducer, REQUEST_POSES } from "../components/drumpyy/assistantAnimation";

export const useUIStore = create((set) => ({
  sidebarCollapsed: false,
  mobileDrawerOpen: false,
  drumpyyOpen: false,
  drumpyyPose: "idle",
  drumpyyCelebrationId: 0,
  drumpyyCelebrationPending: false,
  drumpyyPraisePending: false,
  praiseDrumpyy: () => set((state) => REQUEST_POSES.includes(state.drumpyyPose) || state.drumpyyPose === "celebrating"
    ? { drumpyyPraisePending: true }
    : { drumpyyPose: "proud", drumpyyCelebrationId: state.drumpyyCelebrationId + 1 }),
  celebrateDrumpyy: () => set((state) => REQUEST_POSES.includes(state.drumpyyPose)
    ? { drumpyyCelebrationPending: true }
    : { drumpyyPose: "celebrating", drumpyyCelebrationId: state.drumpyyCelebrationId + 1 }),
  transitionDrumpyyPose: (event) => set((state) => {
    const pose = assistantPoseReducer(state.drumpyyPose, event);
    if (pose === "idle" && state.drumpyyCelebrationPending) return {
      drumpyyPose: "celebrating", drumpyyCelebrationPending: false,
      drumpyyCelebrationId: state.drumpyyCelebrationId + 1,
    };
    if (pose === "idle" && state.drumpyyPraisePending) return {
      drumpyyPose: "proud", drumpyyPraisePending: false,
      drumpyyCelebrationId: state.drumpyyCelebrationId + 1,
    };
    return { drumpyyPose: pose };
  }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  openMobileDrawer: () => set({ mobileDrawerOpen: true }),
  closeMobileDrawer: () => set({ mobileDrawerOpen: false }),
  toggleDrumpyy: () => set((s) => ({ drumpyyOpen: !s.drumpyyOpen })),
}));
