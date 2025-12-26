import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PreferenceStore {
  isTimelineCollapsed: boolean;
  isSidebarCollapsed: boolean;
  setIsTimelineCollapsed: (collapsed: boolean) => void;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
}

export const usePreferenceStore = create<PreferenceStore>()(
  persist(
    (set) => ({
      isTimelineCollapsed: false,
      isSidebarCollapsed: false,
      setIsTimelineCollapsed: (collapsed) => set({ isTimelineCollapsed: collapsed }),
      setIsSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
    }),
    { name: "preference-store" },
  ),
);
