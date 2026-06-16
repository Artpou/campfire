import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { QualityPreference } from "@/features/settings/constants/torrent-preferences";

interface UserPreferences {
  quality: QualityPreference;
  maxSize: number | null;
}

interface UserPreferenceStore extends UserPreferences {
  setQuality: (quality: QualityPreference) => void;
  setMaxSize: (maxSize: number | null) => void;
}

export const useUserPreferences = create<UserPreferenceStore>()(
  persist(
    (set) => ({
      quality: "all",
      maxSize: null,
      setQuality: (quality) => set({ quality }),
      setMaxSize: (maxSize) => set({ maxSize }),
    }),
    {
      name: "user-preferences",
    },
  ),
);
