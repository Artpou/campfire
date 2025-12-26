import { TMDB } from "tmdb-ts";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TmdbStore {
  apiKey: string | null;
  tmdb: TMDB | null;
  tmdbLoading: boolean;
  isLogged: boolean;
  updateApiKey: (key: string | null) => void;
}

export const useTmdbStore = create<TmdbStore>()(
  persist(
    (set) => ({
      apiKey: null,
      tmdb: null,
      tmdbLoading: false,
      isLogged: false,

      updateApiKey: (key) => {
        if (key) {
          set({
            apiKey: key,
            tmdb: new TMDB(key),
            isLogged: true,
            tmdbLoading: false,
          });
        } else {
          set({
            apiKey: null,
            tmdb: null,
            isLogged: false,
            tmdbLoading: false,
          });
        }
      },
    }),
    {
      name: "tmdb-store",
      partialize: (state) => ({ apiKey: state.apiKey }),
      onRehydrateStorage: () => (state) => {
        if (state?.apiKey) {
          state.updateApiKey(state.apiKey);
        }
      },
    },
  ),
);
