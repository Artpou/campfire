import type { MediaEnriched } from "@/modules/media/media.dto";
import type { TMDBItem, TMDBSeasonDetails, TMDBTvDetails } from "@/modules/tmdb/tmdb.dto";
import { tmdbTVToMedia } from "@/modules/tmdb/tmdb.helper";
import { TMDBService } from "@/modules/tmdb/tmdb.service";
import type { TV } from "@/modules/tv/tv.dto";

export class TVService extends TMDBService<TV> {
  getMany(): Promise<TV[]> {
    return Promise.resolve([]);
  }

  async get(id: string): Promise<TV> {
    const tvData = await this.request<TMDBTvDetails>(`/${this.type}/${id}`, {
      appendToResponse: "watch/providers,videos,credits,recommendations,external_ids",
    });

    const recommendations = (tvData.recommendations?.results ?? []) as TMDBItem[];
    const related = recommendations.map((item) => tmdbTVToMedia(item));
    const mediaMap = await this.mediaService.getMany({ ids: related.map((m) => m.id.toString()) });

    const withMediaStatus = (list: MediaEnriched[]) =>
      list.map((item) => mediaMap.find((m) => m.id === item.id) ?? item);

    return {
      id,
      tv: tvData,
      media: tmdbTVToMedia(tvData),
      collection: null,
      related: {
        collection: [],
        recommendations: withMediaStatus(related),
      },
    };
  }

  async tvSeasonDetails(tvShowID: string, seasonNumber: number): Promise<TMDBSeasonDetails> {
    return this.request(`/tv/${tvShowID}/season/${seasonNumber}`);
  }
}
