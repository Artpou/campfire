import { eq } from "drizzle-orm";

import { AuthenticatedService } from "@/classes/authenticated-service";
import { db } from "@/db/db";
import { media } from "@/db/schema";
import { MediaLikeService } from "./media-like.service";
import { MediaWatchListService } from "./media-watch-list.service";

export class MediaService extends AuthenticatedService {
  async get(id: number) {
    const [result] = await db.select().from(media).where(eq(media.id, id)).limit(1);
    return result ?? null;
  }

  async getMediaStatus(mediaId: number) {
    const likeService = new MediaLikeService(this.user);
    const watchListService = new MediaWatchListService(this.user);

    const [isLiked, isInWatchList] = await Promise.all([
      likeService.isLiked(mediaId),
      watchListService.isInWatchList(mediaId),
    ]);

    return {
      isLiked,
      isInWatchList,
    };
  }

  async getMediaStatusBatch(mediaIds: number[]) {
    if (mediaIds.length === 0) {
      return {};
    }

    const likeService = new MediaLikeService(this.user);
    const watchListService = new MediaWatchListService(this.user);

    const [likedIds, watchListIds] = await Promise.all([
      likeService.getBatchStatus(mediaIds),
      watchListService.getBatchStatus(mediaIds),
    ]);

    const likedSet = new Set(likedIds);
    const watchListSet = new Set(watchListIds);

    const statusMap: Record<number, { isLiked: boolean; isInWatchList: boolean }> = {};
    for (const mediaId of mediaIds) {
      statusMap[mediaId] = {
        isLiked: likedSet.has(mediaId),
        isInWatchList: watchListSet.has(mediaId),
      };
    }

    return statusMap;
  }
}
