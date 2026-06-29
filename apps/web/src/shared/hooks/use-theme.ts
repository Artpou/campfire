import { useEffect } from "react";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

type Theme = "light" | "dark";

interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

function readLegacyTheme(): Theme | null {
  const legacy = localStorage.getItem("theme");
  if (legacy === "light" || legacy === "dark") return legacy;
  return null;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: readLegacyTheme() ?? "dark",
      toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "seedarr-theme",
    },
  ),
);

export function useTheme() {
  return useThemeStore(
    useShallow((state) => ({
      theme: state.theme,
      toggleTheme: state.toggleTheme,
      setTheme: state.setTheme,
    })),
  );
}

export function useThemeSync(): void {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "light") {
      root.classList.add("light");
    }

    const legacy = localStorage.getItem("theme");
    if (legacy === "light" || legacy === "dark") {
      localStorage.removeItem("theme");
    }
  }, [theme]);
}
