import type { Resolution } from "@seedarr/contracts";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewMode = "grid" | "list";

interface UserPreferences {
  quality: Resolution | null;
  maxSize: number | null;
  viewMode: ViewMode;
  showCategories: boolean;
}

interface UserPreferenceStore extends UserPreferences {
  setQuality: (quality: Resolution | null) => void;
  setMaxSize: (maxSize: number | null) => void;
  setViewMode: (viewMode: ViewMode) => void;
  setShowCategories: (showCategories: boolean) => void;
}

export const useUserPreferences = create<UserPreferenceStore>()(
  persist(
    (set) => ({
      quality: null,
      maxSize: null,
      viewMode: "grid",
      showCategories: false,
      setQuality: (quality) => set({ quality }),
      setMaxSize: (maxSize) => set({ maxSize }),
      setViewMode: (viewMode) => set({ viewMode }),
      setShowCategories: (showCategories) => set({ showCategories }),
    }),
    {
      name: "user-preferences",
    },
  ),
);
