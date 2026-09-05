import { fetchImdbRating } from "@/modules/media/cinemeta/cinemeta.service";
import { mergeMediaEnrichment } from "@/modules/media/media.helper";
import { listEnrichedMedia } from "@/modules/media/media-list.repository";
import { tmdbTVToMedia } from "@/modules/tmdb/tmdb.helper";
import { TMDBService } from "@/modules/tmdb/tmdb.service";
import type { TMDBSeasonDetails, TMDBTvDetails } from "@/modules/tmdb/tmdb.types";
import type { TV } from "@/modules/tv/tv.types";

export class TVService extends TMDBService {
  async get(id: string): Promise<TV> {
    const tvData = await this.request<TMDBTvDetails>(`/${this.type}/${id}`, {
      appendToResponse: "watch/providers,videos,credits,recommendations,external_ids",
    });

    const recommendations = tvData.recommendations?.results ?? [];
    const related = recommendations.map((item) => tmdbTVToMedia(item));
    const mediaMap = await listEnrichedMedia(this.user.id, {
      ids: [id, ...related.map((m) => m.id.toString())],
    });

    const fromTmdb = tmdbTVToMedia(tvData);
    const fromDb = mediaMap.find((m) => m.id.toString() === id);
    const media = fromDb ? { ...fromDb, imdbId: fromDb.imdbId || fromTmdb.imdbId } : fromTmdb;
    const imdbRating = await fetchImdbRating(media.imdbId || tvData.external_ids?.imdb_id, "tv");

    return {
      id,
      tv: tvData,
      media,
      imdbRating,
      collection: null,
      related: {
        collection: [],
        recommendations: mergeMediaEnrichment(related, mediaMap),
      },
    };
  }

  async tvSeasonDetails(tvShowID: string, seasonNumber: number): Promise<TMDBSeasonDetails> {
    return this.request(`/tv/${tvShowID}/season/${seasonNumber}`);
  }
}
