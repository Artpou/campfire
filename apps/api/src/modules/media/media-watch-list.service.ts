import { and, desc, eq, inArray } from "drizzle-orm";

import { AuthenticatedService } from "@/classes/authenticated-service";
import { db } from "@/db/db";
import { Media, media, userWatchList } from "@/db/schema";

export class MediaWatchListService extends AuthenticatedService {
  async toggle(mediaData: Media) {
    // Ensure media exists
    await db.insert(media).values(mediaData).onConflictDoUpdate({
      target: media.id,
      set: mediaData,
    });

    // Check if already in watch list
    const [existing] = await db
      .select()
      .from(userWatchList)
      .where(and(eq(userWatchList.userId, this.user.id), eq(userWatchList.mediaId, mediaData.id)))
      .limit(1);

    if (existing) {
      // Remove from watch list
      await db
        .delete(userWatchList)
        .where(
          and(eq(userWatchList.userId, this.user.id), eq(userWatchList.mediaId, mediaData.id)),
        );
      return { success: true, isInWatchList: false };
    }

    // Add to watch list
    await db.insert(userWatchList).values({
      userId: this.user.id,
      mediaId: mediaData.id,
      addedAt: new Date(),
    });

    return { success: true, isInWatchList: true };
  }

  async getWatchList(type?: "movie" | "tv", page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const results = await db
      .select({
        media: media,
        addedAt: userWatchList.addedAt,
      })
      .from(userWatchList)
      .innerJoin(media, eq(userWatchList.mediaId, media.id))
      .where(eq(userWatchList.userId, this.user.id))
      .orderBy(desc(userWatchList.addedAt))
      .limit(limit + 1)
      .offset(offset);

    const mapped = results.map((r) => ({ ...r.media, addedAt: r.addedAt }));
    const filtered = type ? mapped.filter((item) => item.type === type) : mapped;

    const hasMore = filtered.length > limit;
    const items = hasMore ? filtered.slice(0, limit) : filtered;

    return {
      results: items,
      page,
      hasMore,
    };
  }

  async isInWatchList(mediaId: number) {
    const [inWatchList] = await db
      .select()
      .from(userWatchList)
      .where(and(eq(userWatchList.userId, this.user.id), eq(userWatchList.mediaId, mediaId)))
      .limit(1);

    return !!inWatchList;
  }

  async getBatchStatus(mediaIds: number[]) {
    if (mediaIds.length === 0) {
      return [];
    }

    const results = await db
      .select({ mediaId: userWatchList.mediaId })
      .from(userWatchList)
      .where(and(eq(userWatchList.userId, this.user.id), inArray(userWatchList.mediaId, mediaIds)));

    return results.map((r) => r.mediaId);
  }
}
