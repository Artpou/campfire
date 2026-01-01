import { AvailableLanguage, DiscoverQueryOptions, TMDB } from "tmdb-ts";

const TMDB_API_URL = "https://api.themoviedb.org/3";
// Yes, API key is shared, but it's only in read-only with api-v3.
const DEFAULT_TMDB_API_KEY = "29f788393063cd24bfb885d7d6ee9ae4";

// In fetchTMDB function, update the options type:
const fetchTMDB = (apiKey: string, language?: AvailableLanguage) => {
  return async (url: string, options?: Record<string, string | string[] | undefined>) => {
    const fullUrl = new URL(`${TMDB_API_URL}${url}`);
    fullUrl.searchParams.set("api_key", apiKey);

    if (language) fullUrl.searchParams.set("language", language);

    if (options) {
      for (const [key, value] of Object.entries(options)) {
        if (value === undefined) continue;

        if (key === "with_watch_providers") {
          fullUrl.searchParams.set("watch_region", language?.split("-")[1] || "US");
        }

        const paramValue = Array.isArray(value) ? value.join(",") : value;
        const snakeCaseKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        fullUrl.searchParams.set(snakeCaseKey, paramValue);
      }
    }

    const res = await fetch(fullUrl.toString());

    if (!res.ok) {
      throw new Error(`Failed to fetch TMDB: ${res.statusText}`);
    }

    return res.json();
  };
};

export interface TMDBClientType {
  movies: Pick<TMDB["movies"], "details">;
  tvShows: Pick<TMDB["tvShows"], "details">;
  search: Pick<TMDB["search"], "multi">;
  discover: Pick<TMDB["discover"], "movie" | "tvShow">;
  genres: Pick<TMDB["genres"], "movies" | "tvShows">;
  collections: Pick<TMDB["collections"], "details">;
  watchProviders: Pick<TMDB["watchProviders"], "getMovieProviders" | "getTvProviders">;
}

export const tmdbClient = ({
  apiKey = DEFAULT_TMDB_API_KEY,
  language,
}: {
  apiKey?: string;
  language: AvailableLanguage;
}): TMDBClientType => {
  const request = fetchTMDB(apiKey, language);

  const toGenericOptions = (options: DiscoverQueryOptions) => {
    if (options.sort_by === "vote_average.desc") {
      options["vote_count.gte"] = 300;
    }

    if (options.sort_by === "release_date.desc") {
      options.sort_by = "popularity.desc";
      const today = new Date().toISOString().split("T")[0];
      // @ts-expect-error - ugly fix to handle MovieQueryOptions and TvShowQueryOptions sorting
      options["primary_release_date.gte"] = today;
      // @ts-expect-error - same
      options["first_air_date.gte"] = today;
    }

    return Object.fromEntries(Object.entries(options).filter(([_, value]) => value !== undefined));
  };

  return {
    movies: {
      details: async (id, appendToResponse) => request(`/movie/${id}`, { appendToResponse }),
    },
    tvShows: {
      details: async (id, appendToResponse) => request(`/tv/${id}`, { appendToResponse }),
    },
    search: {
      multi: async ({ query }) => request("/search/multi", { query }),
    },
    discover: {
      movie: async (options = {}) => request("/discover/movie", toGenericOptions(options)),
      tvShow: async (options = {}) => request("/discover/tv", toGenericOptions(options)),
    },
    genres: {
      movies: async () => request("/genre/movie/list"),
      tvShows: async () => request("/genre/tv/list"),
    },
    collections: {
      details: async (id) => request(`/collection/${id}`),
    },
    watchProviders: {
      getMovieProviders: async (options = {}) =>
        request("/watch/providers/movie", toGenericOptions(options)),
      getTvProviders: async (options = {}) =>
        request("/watch/providers/tv", toGenericOptions(options)),
    },
  };
};
