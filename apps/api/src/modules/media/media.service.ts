import type { ListMediaQuery, UpdateProgressQuery, UpsertReviewInput } from "@seedarr/contracts";

import { logger } from "@/shared/helpers/logger.helper";
import { IdentifiableService } from "@/shared/services/authenticated.service";

import { assertMediaId } from "@/modules/media/media.helper";
import { mediaRepository } from "@/modules/media/media.repository";
import type { MediaInsert } from "@/modules/media/media.schema";
import { mediaListRepository } from "@/modules/media/media-list.repository";
import { mediaRelationsRepository } from "@/modules/media/media-relations.repository";
import type { MediaEnriched } from "./media.types";

export class MediaService extends IdentifiableService<MediaEnriched> {
  async getMany(query: ListMediaQuery = {}): Promise<MediaEnriched[]> {
    const userId = query.userId ?? this.user.id;
    return mediaListRepository.listEnriched(userId, query);
  }

  async upsert(data: MediaInsert): Promise<MediaEnriched> {
    const result = await mediaRepository.upsert(data);
    const media = await this.get(result.id.toString());
    logger.info("MEDIA", `Upserted ${media.type} ${media.id} (${media.title})`);
    return media;
  }

  async toggleLike(data: MediaInsert): Promise<MediaEnriched | undefined> {
    assertMediaId(data.id);
    await mediaRelationsRepository.toggle(this.user.id, "like", data);
    return this.get(data.id.toString());
  }

  async toggleWatchList(data: MediaInsert): Promise<MediaEnriched | undefined> {
    assertMediaId(data.id);
    await mediaRelationsRepository.toggle(this.user.id, "watchlist", data);
    return this.get(data.id.toString());
  }

  async upsertReview(
    mediaId: number,
    input: Pick<UpsertReviewInput, "score" | "comment" | "watchedAt">,
    mediaData?: MediaInsert,
  ): Promise<MediaEnriched> {
    await mediaRelationsRepository.upsertReview(this.user.id, mediaId, input, mediaData);
    const media = await this.get(mediaId.toString());
    logger.info("MEDIA", `Review saved for ${media.type} ${media.id} (score: ${input.score ?? "none"})`);
    return media;
  }

  async deleteReview(mediaId: number): Promise<MediaEnriched> {
    await mediaRelationsRepository.deleteReview(this.user.id, mediaId);
    const media = await this.get(mediaId.toString());
    logger.info("MEDIA", `Review deleted for ${media.type} ${media.id}`);
    return media;
  }

  async updateProgress(mediaId: number, input: UpdateProgressQuery): Promise<void> {
    await mediaRelationsRepository.updateProgress(this.user.id, mediaId, input);
  }
}
