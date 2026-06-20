import { Resolution } from "@seedarr/sdk";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserPreferences {
  quality: Resolution | null;
  maxSize: number | null;
}

interface UserPreferenceStore extends UserPreferences {
  setQuality: (quality: Resolution | null) => void;
  setMaxSize: (maxSize: number | null) => void;
}

export const useUserPreferences = create<UserPreferenceStore>()(
  persist(
    (set) => ({
      quality: null,
      maxSize: null,
      setQuality: (quality) => set({ quality }),
      setMaxSize: (maxSize) => set({ maxSize }),
    }),
    {
      name: "user-preferences",
    },
  ),
);
