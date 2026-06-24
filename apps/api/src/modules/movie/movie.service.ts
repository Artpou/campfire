import { BadRequestError } from "@/errors/error";
import type { MediaEnriched } from "@/modules/media/media.dto";
import { TMDBItem, TMDBMovieDetails } from "@/modules/tmdb/tmdb.dto";
import { tmdbMovieToMedia } from "@/modules/tmdb/tmdb.helper";
import { TMDBService } from "@/modules/tmdb/tmdb.service";
import { User } from "@/types";
import type { Movie } from "./movie.dto";

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

    const mediaMap = await this.mediaService.getMany({ ids: allRelated.map((m) => m.id.toString()) });
    const collectionIds = new Set(collectionParts.map((p) => p.id));

    const withMediaStatus = (list: MediaEnriched[]) =>
      list.map((item) => mediaMap.find((m) => m.id === item.id) ?? item);

    return {
      id,
      movie: movieData,
      media: tmdbMovieToMedia(movieData),
      collection,
      related: {
        collection: withMediaStatus(allRelated.filter((m) => collectionIds.has(m.id))).sort((a, b) =>
          (a.release_date ?? "").localeCompare(b.release_date ?? ""),
        ),
        recommendations: withMediaStatus(allRelated.filter((m) => !collectionIds.has(m.id))),
      },
    };
  }
}
