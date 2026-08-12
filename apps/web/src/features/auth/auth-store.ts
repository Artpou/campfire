import type { AuthUser } from "@seedarr/sdk";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthStore {
  user: AuthUser | null;
  ownerOnboardingCompleted: boolean;
  setUser: (user: AuthUser | null) => void;
  setOwnerOnboardingCompleted: () => void;
  logout: () => void;
}

export const useAuth = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      ownerOnboardingCompleted: false,
      setUser: (user) => set({ user }),
      setOwnerOnboardingCompleted: () => set({ ownerOnboardingCompleted: true }),
      logout: () => set({ user: null }),
    }),
    {
      name: "auth-storage",
      // Only persist onboarding flag — user always comes from /auth/me (httpOnly session).
      partialize: (state) => ({ ownerOnboardingCompleted: state.ownerOnboardingCompleted }),
    },
  ),
);
