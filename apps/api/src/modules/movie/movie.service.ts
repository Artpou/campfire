import { BadRequestError } from "@/shared/errors/error";

import { fetchImdbRating } from "@/modules/media/cinemeta/cinemeta.service";
import { mergeMediaEnrichment } from "@/modules/media/media.helper";
import { listEnrichedMedia } from "@/modules/media/media-list.repository";
import { tmdbMovieToMedia } from "@/modules/tmdb/tmdb.helper";
import { TMDBService } from "@/modules/tmdb/tmdb.service";
import type { TMDBItem, TMDBMovieDetails } from "@/modules/tmdb/tmdb.types";
import type { User } from "@/modules/user/user.schema";
import type { Movie } from "./movie.types";

export class MovieService extends TMDBService<Movie> {
  constructor(user: User, locale: string) {
    super(user, locale, "movie");
  }

  /** @deprecated use get instead */
  getMany(): Promise<Movie[]> {
    throw new BadRequestError("Not implemented");
  }

  async get(id: string): Promise<Movie> {
    const movieData = await this.request<TMDBMovieDetails>(`/${this.type}/${id}`, {
      appendToResponse: "watch/providers,videos,credits,recommendations,external_ids,release_dates,alternative_titles",
    });

    movieData.title =
      movieData.alternative_titles?.titles?.find((t) => t.iso_3166_1 === "US" && t.type === "")?.title ||
      movieData.alternative_titles?.titles?.find((t) => t.iso_3166_1 === "US")?.title ||
      movieData.alternative_titles?.titles?.find((t) => t.type === "(English)")?.title;

    let collection: (Record<string, unknown> & { parts?: TMDBItem[] }) | null = null;
    if (movieData.belongs_to_collection?.id) {
      collection = await this.request(`/collection/${movieData.belongs_to_collection.id}`);
    }

    const collectionParts = (collection?.parts ?? []).filter((p) => p.id.toString() !== id);
    const recommendations = movieData.recommendations?.results ?? [];
    const allRelated = [
      ...collectionParts.map((item) => tmdbMovieToMedia(item)),
      ...recommendations.map((item) => tmdbMovieToMedia(item)),
    ];

    const mediaMap = await listEnrichedMedia(this.user.id, {
      ids: [id, ...allRelated.map((m) => m.id.toString())],
    });
    const collectionIds = new Set(collectionParts.map((p) => p.id));

    const fromTmdb = tmdbMovieToMedia(movieData);
    const fromDb = mediaMap.find((m) => m.id.toString() === id);
    const media = fromDb ? { ...fromDb, imdbId: fromDb.imdbId || fromTmdb.imdbId } : fromTmdb;
    const imdbRating = await fetchImdbRating(media.imdbId || movieData.external_ids?.imdb_id, "movie");

    return {
      id,
      movie: movieData,
      media,
      imdbRating,
      collection,
      related: {
        collection: mergeMediaEnrichment(
          allRelated.filter((m) => collectionIds.has(m.id)),
          mediaMap,
        ).sort((a, b) => (a.release_date ?? "").localeCompare(b.release_date ?? "")),
        recommendations: mergeMediaEnrichment(
          allRelated.filter((m) => !collectionIds.has(m.id)),
          mediaMap,
        ),
      },
    };
  }
}
