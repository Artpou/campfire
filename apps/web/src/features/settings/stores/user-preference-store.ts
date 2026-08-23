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
}

interface UserPreferenceStore extends UserPreferences {
  setQuality: (quality: Resolution | null) => void;
  setMaxSize: (maxSize: number | null) => void;
  setViewMode: (scope: ViewModeScope, viewMode: ViewMode) => void;
}

export const useUserPreferences = create<UserPreferenceStore>()(
  persist(
    (set) => ({
      quality: null,
      maxSize: null,
      viewModes: { ...DEFAULT_VIEW_MODES },
      setQuality: (quality) => set({ quality }),
      setMaxSize: (maxSize) => set({ maxSize }),
      setViewMode: (scope, viewMode) => set((state) => ({ viewModes: { ...state.viewModes, [scope]: viewMode } })),
    }),
    {
      name: "user-preferences",
      version: 2,
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
        const migrated = {
          ...state,
          viewModes: { ...DEFAULT_VIEW_MODES, ...(state.viewModes as Record<ViewModeScope, ViewMode> | undefined) },
        };
        if (version < 2) {
          const { showCategories: _removed, ...rest } = migrated as Record<string, unknown>;
          return rest;
        }
        return migrated;
      },
    },
  ),
);
