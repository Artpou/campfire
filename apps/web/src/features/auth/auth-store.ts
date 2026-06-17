import { AuthUser } from "@seedarr/sdk";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthStore {
  user: AuthUser | null;
  onboarded: boolean;
  setUser: (user: AuthUser | null) => void;
  setOnboarded: () => void;
  logout: () => void;
}

export const useAuth = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      onboarded: false,
      setUser: (user) => set({ user }),
      setOnboarded: () => set({ onboarded: true }),
      logout: () => set({ user: null }),
    }),
    {
      name: "auth-storage",
    },
  ),
);
