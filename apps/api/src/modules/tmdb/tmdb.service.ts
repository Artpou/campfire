import { Hono } from "hono";

import { ServiceUnavailableError } from "@/errors/error";
import { authGuard, HonoAuthenticatedVariables } from "@/modules/auth/auth.guard";
import { Identifiable, IdentifiableService } from "@/modules/auth/auth.service";
import type { Media } from "@/modules/media/media.dto";
import { MediaService } from "@/modules/media/media.service";
import { fmdbResultToMedia, tmdbMovieToMedia, tmdbTVToMedia } from "@/modules/tmdb/tmdb.helper";
import { User } from "@/types";
import type {
  FetchOptions,
  FMDBResult,
  TMDBGenresResponse,
  TMDBItem,
  TMDBKeywordResult,
  TMDBPaginatedResponse,
  TMDBProvider,
  TMDBProvidersResponse,
  TMDBVideo,
  TMDBVideosResponse,
  tmdbDiscoverQuery,
  tmdbKeywordsQuery,
  tmdbSearchQuery,
} from "./tmdb.dto";

const TMDB_API_URL = "https://api.themoviedb.org/3";

const FMDB_URL = "https://imdb.iamidiotareyoutoo.com/";
const NUMBER_OF_PROVIDERS = 5;
const TRENDING_LIMIT = 10;

function buildUrl(url: string, language: string | undefined, options?: FetchOptions): string {
  const fullUrl = new URL(`${TMDB_API_URL}${url}`);
  if (!process.env.TMDB_API_KEY) throw new ServiceUnavailableError("TMDB (missing API key)");

  fullUrl.searchParams.set("api_key", process.env.TMDB_API_KEY);
  if (language) fullUrl.searchParams.set("language", language);

  if (options) {
    for (const [key, value] of Object.entries(options)) {
      if (value === undefined) continue;
      if (key === "with_watch_providers") {
        fullUrl.searchParams.set("watch_region", language?.split("-")[1] || "US");
      }
      if (key === "with_release_type") {
        fullUrl.searchParams.set("release_date.lte", new Date().toISOString().split("T")[0]);
      }
      const paramValue = Array.isArray(value) ? value.join(",") : value;
      const snakeCaseKey = key.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
      fullUrl.searchParams.set(snakeCaseKey, paramValue);
    }
  }

  if (
    (url.startsWith("/movie/") || url.startsWith("/tv/")) &&
    fullUrl.searchParams.get("append_to_response")?.includes("videos") &&
    language
  ) {
    fullUrl.searchParams.set("include_video_language", `${language},en`);
  }
  return fullUrl.toString();
}

function normalizeDiscoverOptions(opts: tmdbDiscoverQuery): FetchOptions {
  // biome-ignore lint/suspicious/noExplicitAny: any is used to allow any type of key
  const normalized: Record<string, any> = { ...opts };
  if (opts.sort_by === "vote_average.desc") normalized["vote_count.gte"] = "300";
  if (opts.sort_by === "release_date.desc") {
    normalized.sort_by = "popularity.desc";
    const today = new Date().toISOString().split("T")[0];
    normalized["primary_release_date.gte"] = today;
    normalized["first_air_date.gte"] = today;
  }
  return Object.fromEntries(Object.entries(normalized).filter(([, v]) => v !== undefined)) as FetchOptions;
}
export abstract class TMDBService<S extends Identifiable> extends IdentifiableService<S> {
  protected locale: string;
  protected readonly type: "movie" | "tv";
  protected readonly mediaService: MediaService;

  constructor(user: User, locale: string, type: "movie" | "tv") {
    super(user);
    this.locale = locale;
    this.type = type;
    this.mediaService = new MediaService(user);
  }

  static createTMDBRouter<E extends Identifiable, S extends TMDBService<E>>(
    this: new (
      user: User,
      locale: string,
      type: "movie" | "tv",
    ) => S,
    type: "movie" | "tv",
  ) {
    return new Hono<{ Variables: HonoAuthenticatedVariables & { service: S } }>()
      .use(authGuard)
      .use("*", async (c, next) => {
        const user = c.get("user");
        const locale = c.req.query("locale") ?? "en-US";

        c.set("service", new this(user, locale, type));
        await next();
      });
  }

  protected async request<T>(url: string, options?: FetchOptions): Promise<T> {
    const fullUrl = buildUrl(url, this.locale, options);
    const res = await fetch(fullUrl);
    if (!res.ok) throw new ServiceUnavailableError(`TMDB (${res.status} ${res.statusText})`);
    return res.json() as Promise<T>;
  }

  private get toMedia() {
    return this.type === "movie" ? tmdbMovieToMedia : tmdbTVToMedia;
  }

  async trending(): Promise<Media[]> {
    const today = new Date().toISOString().split("T")[0];
    const data = await this.request<TMDBPaginatedResponse>(`/discover/${this.type}`, {
      sort_by: "popularity.desc",
      with_release_type: "4|5",
      "release_date.lte": today,
    });

    const items = data.results.slice(0, TRENDING_LIMIT);
    const [mediaMap, genresData] = await Promise.all([
      this.mediaService.getMany({ ids: items.map((r) => r.id.toString()) }),
      this.genres(),
    ]);
    const genreMap = new Map(genresData.genres.map((g) => [g.id, g.name]));

    return items.map((item) => {
      const base = this.toMedia(item, genreMap);
      return { ...mediaMap.find((m) => m.id === base.id), ...base, backdrop_path: item.backdrop_path ?? null };
    });
  }

  async discover(query: tmdbDiscoverQuery): Promise<{ results: Media[]; page: number; totalPages: number }> {
    const [data, genresData] = await Promise.all([
      this.request<TMDBPaginatedResponse>(`/discover/${this.type}`, normalizeDiscoverOptions(query)),
      this.genres(),
    ]);

    const genreMap = new Map(genresData.genres.map((g) => [g.id, g.name]));
    const items = data.results.map((item) => ({
      ...this.toMedia(item, genreMap),
      backdrop_path: item.backdrop_path ?? null,
    }));
    const mediaMap = await this.mediaService.getMany({ ids: items.map((m) => m.id.toString()) });

    return {
      results: items.map((item) => ({
        ...(mediaMap.find((m) => m.id === item.id) ?? item),
        backdrop_path: item.backdrop_path ?? null,
      })),
      page: data.page,
      totalPages: data.total_pages,
    };
  }

  async search(query: tmdbSearchQuery): Promise<Media[]> {
    const searchResults = await this.request<TMDBPaginatedResponse<TMDBItem & { media_type: string }>>(
      "/search/multi",
      { query: query.q },
    );
    const items = searchResults.results.filter((r) => r.media_type === this.type).map((item) => this.toMedia(item));

    if (items.length === 0) {
      const res = await fetch(`${FMDB_URL}/justwatch?q=${encodeURIComponent(query.q)}`);
      if (res.ok) {
        const fmdbResult = await (res.json() as Promise<{ description: FMDBResult[] }>);
        items.push(...fmdbResult.description.map(fmdbResultToMedia));
      }
    }

    const mediaMap = await this.mediaService.getMany({ ids: items.map((m) => m.id.toString()) });
    return items.map((item) => mediaMap.find((m) => m.id === item.id) ?? item);
  }

  async searchKeywords(query: tmdbKeywordsQuery): Promise<TMDBKeywordResult[]> {
    const data = await this.request<{ results: TMDBKeywordResult[] }>("/search/keyword", { query: query.q });
    return data.results.slice(0, 8);
  }

  async genres(): Promise<TMDBGenresResponse> {
    return this.request<TMDBGenresResponse>(`/genre/${this.type}/list`);
  }

  async providers(): Promise<TMDBProvider[]> {
    const data = await this.request<TMDBProvidersResponse>(`/watch/providers/${this.type}`);
    const country = this.locale.split("-")[1] || "US";

    return data.results
      .filter(
        (p, i, self) =>
          p.logo_path &&
          p.display_priorities?.[country] &&
          i === self.findIndex((x) => x.provider_name === p.provider_name),
      )
      .sort((a, b) => a.display_priorities[country] - b.display_priorities[country])
      .slice(0, NUMBER_OF_PROVIDERS)
      .map((p) => ({
        provider_id: p.provider_id,
        provider_name: p.provider_name,
        logo_path: p.logo_path,
        display_priorities: {},
      }));
  }

  async trailer(id: string): Promise<TMDBVideo | undefined> {
    const videos = await this.request<TMDBVideosResponse>(`/${this.type}/${id}/videos`);

    const country = this.locale.split("-")[1]?.toUpperCase();
    const youtubeVideos = videos.results.filter((v) => v.site === "YouTube");

    const trailer =
      (country && youtubeVideos.find((v) => v.type === "Trailer" && v.iso_3166_1 === country)) ||
      youtubeVideos.find((v) => v.type === "Trailer") ||
      youtubeVideos[0];

    if (!trailer) return undefined;
    return trailer;
  }
}
