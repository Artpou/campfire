import type { Resolution } from "@seedarr/contracts";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewMode = "grid" | "list";
export type ViewModeScope = "movie" | "tv" | "downloads" | "profile";

const DEFAULT_VIEW_MODES: Record<ViewModeScope, ViewMode> = {
  movie: "grid",
  tv: "grid",
  downloads: "list",
  profile: "grid",
};

interface UserPreferences {
  quality: Resolution | null;
  maxSize: number | null;
  viewModes: Record<ViewModeScope, ViewMode>;
  showCategories: boolean;
}

interface UserPreferenceStore extends UserPreferences {
  setQuality: (quality: Resolution | null) => void;
  setMaxSize: (maxSize: number | null) => void;
  setViewMode: (scope: ViewModeScope, viewMode: ViewMode) => void;
  setShowCategories: (showCategories: boolean) => void;
}

export const useUserPreferences = create<UserPreferenceStore>()(
  persist(
    (set) => ({
      quality: null,
      maxSize: null,
      viewModes: { ...DEFAULT_VIEW_MODES },
      showCategories: false,
      setQuality: (quality) => set({ quality }),
      setMaxSize: (maxSize) => set({ maxSize }),
      setViewMode: (scope, viewMode) => set((state) => ({ viewModes: { ...state.viewModes, [scope]: viewMode } })),
      setShowCategories: (showCategories) => set({ showCategories }),
    }),
    {
      name: "user-preferences",
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as Record<string, unknown>;
        if (version < 1) {
          const previous = state.viewMode === "list" || state.viewMode === "grid" ? state.viewMode : "grid";
          return {
            ...state,
            viewModes: {
              movie: previous,
              tv: previous,
              downloads: "list",
              profile: previous,
            },
          };
        }
        return {
          ...state,
          viewModes: { ...DEFAULT_VIEW_MODES, ...(state.viewModes as Record<ViewModeScope, ViewMode> | undefined) },
        };
      },
    },
  ),
);
