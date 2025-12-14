import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const PREFERENCE_STORAGE_KEY = "preference-store";

interface PreferenceState {
  isTimelineCollapsed: boolean;
  isSidebarCollapsed: boolean; // We might want to sync this with the sidebar component's state if possible, or just store it here.
}

interface PreferenceActions {
  setIsTimelineCollapsed: (collapsed: boolean) => void;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
}

export const usePreferenceStore = create<PreferenceState & PreferenceActions>()(
  persist(
    (set) => ({
      isTimelineCollapsed: false,
      isSidebarCollapsed: false,

      setIsTimelineCollapsed: (collapsed) => set({ isTimelineCollapsed: collapsed }),
      setIsSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
    }),
    {
      name: PREFERENCE_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
