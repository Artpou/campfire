import { AvailableLanguage, TMDB } from "tmdb-ts";

const TMDB_API_URL = "https://api.themoviedb.org/3";
// Yes, API key is shared, but it's only in read-only with api-v3.
const DEFAULT_TMDB_API_KEY = "29f788393063cd24bfb885d7d6ee9ae4";

const fetchTMDB = (apiKey: string, language?: AvailableLanguage) => {
  return async (
    url: string,
    options?: {
      appendToResponse?: string[];
      query?: string;
      with_genres?: string;
    },
  ) => {
    const fullUrl = new URL(`${TMDB_API_URL}${url}`);
    fullUrl.searchParams.set("api_key", apiKey);

    if (language) fullUrl.searchParams.set("language", language);

    if (options?.appendToResponse)
      fullUrl.searchParams.set("append_to_response", options.appendToResponse.join(","));
    if (options?.query) fullUrl.searchParams.set("query", options.query);
    if (options?.with_genres) fullUrl.searchParams.set("with_genres", options.with_genres);

    const res = await fetch(fullUrl.toString());

    if (!res.ok) {
      throw new Error(`Failed to fetch TMDB: ${res.statusText}`);
    }

    return res.json();
  };
};

export interface TMDBClientType {
  movies: Pick<TMDB["movies"], "popular" | "topRated" | "upcoming" | "nowPlaying" | "details">;
  tvShows: Pick<TMDB["tvShows"], "popular" | "topRated" | "onTheAir" | "airingToday" | "details">;
  search: Pick<TMDB["search"], "multi">;
  discover: Pick<TMDB["discover"], "movie" | "tvShow">;
}

export const tmdbClient = ({
  apiKey = DEFAULT_TMDB_API_KEY,
  language,
}: {
  apiKey?: string;
  language: AvailableLanguage;
}): TMDBClientType => {
  const request = fetchTMDB(apiKey, language);

  return {
    movies: {
      popular: async () => request("/movie/popular"),
      topRated: async () => request("/movie/top_rated"),
      upcoming: async () => request("/movie/upcoming"),
      nowPlaying: async () => request("/movie/now_playing"),
      details: async (id, appendToResponse) => request(`/movie/${id}`, { appendToResponse }),
    },
    tvShows: {
      popular: async () => request("/tv/popular"),
      topRated: async () => request("/tv/top_rated"),
      onTheAir: async () => request("/tv/on_the_air"),
      airingToday: async () => request("/tv/airing_today"),
      details: async (id, appendToResponse) => request(`/tv/${id}`, { appendToResponse }),
    },
    search: {
      multi: async ({ query }) => request("/search/multi", { query }),
    },
    discover: {
      movie: async ({ with_genres } = {}) => request("/discover/movie", { with_genres }),
      tvShow: async ({ with_genres } = {}) => request("/discover/tv", { with_genres }),
    },
  };
};
