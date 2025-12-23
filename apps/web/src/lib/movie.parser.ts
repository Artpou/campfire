import type { MovieDetails, MultiSearchResult, Search } from "tmdb-ts";

interface JustWatchOffer {
  type: string;
  name: string;
  url: string;
}

interface JustWatchMovie {
  id: string;
  type: "MOVIE" | "SHOW";
  url: string;
  title: string;
  year: number;
  runtime: number;
  photo_url: string[];
  backdrops: string[];
  tmdbId: string;
  imdbId: string;
  jwRating: number;
  tomatoMeter: number | null;
  tomatoCertifiedFresh: boolean | null;
  offers: JustWatchOffer[];
}

interface JustWatchResponse {
  ok: boolean;
  error_code: number;
  description: JustWatchMovie[];
}

export function parseJustWatchResponse(response: unknown): Search<MultiSearchResult> {
  const data = response as JustWatchResponse;
  if (!data.ok || !data.description || data.description.length === 0) {
    return {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0,
    };
  }

  const results: MultiSearchResult[] = data.description
    .filter((item) => item.type === "MOVIE")
    .map((item): MultiSearchResult => {
      const numericId = item.imdbId?.replace("tt", "");
      const releaseDate = item.year ? `${item.year}-01-01` : "";

      return {
        id: Number(numericId),
        title: item.title,
        poster_path: item.photo_url?.[0],
        backdrop_path: item.backdrops?.[0],
        media_type: "movie",
        release_date: releaseDate,
        vote_average: item.tomatoMeter ? item.tomatoMeter / 10 : 0,
        vote_count: 0,
        popularity: item.jwRating || 0,
        overview: "",
        adult: false,
        video: false,
        original_language: "en",
        original_title: item.title,
        genre_ids: [],
      };
    });

  return {
    page: 1,
    results,
    total_pages: 1,
    total_results: results.length,
  };
}

interface ImdbResponse {
  ok: boolean;
  error_code: number;
  description: string;
  imdbId: string;
  short?: {
    name?: string;
    alternateName?: string;
    image?: string;
    description?: string;
    aggregateRating?: {
      ratingValue?: number;
      ratingCount?: number;
    };
    contentRating?: string;
    genre?: string[];
    datePublished?: string;
    duration?: string;
    trailer?: {
      url?: string;
      embedUrl?: string;
    };
    url?: string;
  };
  top?: {
    id?: string;
    titleText?: {
      text?: string;
    };
    originalTitleText?: {
      text?: string;
    };
    releaseYear?: {
      year?: number;
    };
    releaseDate?: {
      year?: number;
      month?: number;
      day?: number;
    };
    runtime?: {
      seconds?: number;
    };
    ratingsSummary?: {
      aggregateRating?: number;
      voteCount?: number;
    };
    genres?: {
      genres?: Array<{
        text?: string;
      }>;
    };
    certificate?: {
      rating?: string;
    };
    productionStatus?: {
      currentProductionStage?: {
        id?: string;
      };
    };
    titleType?: {
      id?: string;
      isSeries?: boolean;
    };
    plot?: {
      plotText?: {
        plainText?: string;
      };
    };
    primaryImage?: {
      url?: string;
    };
    primaryVideos?: {
      edges?: Array<{
        node?: {
          id?: string;
          playbackURLs?: Array<{
            url?: string;
          }>;
        };
      }>;
    };
  };
  main?: {
    id?: string;
    titleMainImages?: {
      total: number;
      edges?: Array<{
        node?: {
          url?: string;
          width?: number;
          height?: number;
        };
      }>;
    };
    ratingsSummary?: {
      aggregateRating?: number;
      voteCount?: number;
    };
  };
}

function parseDuration(duration?: string): number {
  if (!duration) return 0;
  // Parse PT1H37M format
  const hoursMatch = duration.match(/(\d+)H/);
  const minutesMatch = duration.match(/(\d+)M/);
  const hours = hoursMatch ? Number.parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? Number.parseInt(minutesMatch[1], 10) : 0;
  return hours * 60 + minutes;
}

function formatReleaseDate(
  releaseDate?: { year?: number; month?: number; day?: number },
  datePublished?: string,
): string {
  if (releaseDate?.year && releaseDate.month && releaseDate.day) {
    const month = releaseDate.month.toString().padStart(2, "0");
    const day = releaseDate.day.toString().padStart(2, "0");
    return `${releaseDate.year}-${month}-${day}`;
  }
  if (datePublished) {
    return datePublished;
  }
  return "";
}

export function parseImdbMovieResponse(response: unknown): MovieDetails | null {
  const data = response as ImdbResponse;
  if (!data.ok || !data.imdbId) return null;

  const short = data.short || {};
  const top = data.top || {};
  const main = data.main || {};

  const runtimeSeconds = top.runtime?.seconds || 0;
  const runtime =
    runtimeSeconds > 0 ? Math.floor(runtimeSeconds / 60) : parseDuration(short.duration);
  const releaseDate = formatReleaseDate(top.releaseDate, short.datePublished);

  const posterUrl = top.primaryImage?.url || short.image;

  // Find a backdrop (wide image) from titleMainImages
  // Prefer images with width > height to act as backdrops
  const candidateImages = main.titleMainImages?.edges || [];
  const backdropUrl =
    candidateImages.find((edge) => (edge.node?.width ?? 0) > (edge.node?.height ?? 0))?.node?.url ||
    candidateImages[0]?.node?.url;

  const numericIdStr = data.imdbId?.replace("tt", "") || top.id?.replace("tt", "");
  const numericId = numericIdStr ? Number.parseInt(numericIdStr, 10) : 0;

  return {
    id: numericId,
    adult: false,
    backdrop_path: backdropUrl || "",
    belongs_to_collection: undefined,
    budget: 0,
    genres: (
      top.genres?.genres?.map((g, idx) => ({ id: idx, name: g.text || "" })) ||
      short.genre?.map((g, idx) => ({ id: idx, name: g })) ||
      []
    ).filter((g) => g.name),
    homepage: short.url ?? "",
    imdb_id: data.imdbId ?? top.id ?? "",
    original_language: "en",
    original_title: top.originalTitleText?.text || short.alternateName || "",
    overview: top.plot?.plotText?.plainText || short.description || "",
    popularity: 0,
    poster_path: posterUrl || undefined,
    production_companies: [],
    production_countries: [],
    release_date: releaseDate || "",
    revenue: 0,
    runtime: runtime || 0,
    spoken_languages: [],
    status:
      top.productionStatus?.currentProductionStage?.id === "released" ? "Released" : "Released",
    tagline: "",
    title: top.titleText?.text || short.name || "",
    video: false,
    vote_average:
      top.ratingsSummary?.aggregateRating ||
      main.ratingsSummary?.aggregateRating ||
      short.aggregateRating?.ratingValue ||
      0,
    vote_count:
      top.ratingsSummary?.voteCount ||
      main.ratingsSummary?.voteCount ||
      short.aggregateRating?.ratingCount ||
      0,
  } as MovieDetails;
}
