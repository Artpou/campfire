import { and, desc, eq, inArray } from "drizzle-orm";

import { AuthenticatedService } from "@/classes/authenticated-service";
import { db } from "@/db/db";
import { Media, media, userLikes } from "@/db/schema";

export class MediaLikeService extends AuthenticatedService {
  async toggle(mediaData: Media) {
    // Ensure media exists
    await db.insert(media).values(mediaData).onConflictDoUpdate({
      target: media.id,
      set: mediaData,
    });

    // Check if already liked
    const [existing] = await db
      .select()
      .from(userLikes)
      .where(and(eq(userLikes.userId, this.user.id), eq(userLikes.mediaId, mediaData.id)))
      .limit(1);

    if (existing) {
      // Unlike
      await db
        .delete(userLikes)
        .where(and(eq(userLikes.userId, this.user.id), eq(userLikes.mediaId, mediaData.id)));
      return { success: true, isLiked: false };
    }

    // Like
    await db.insert(userLikes).values({
      userId: this.user.id,
      mediaId: mediaData.id,
      likedAt: new Date(),
    });

    return { success: true, isLiked: true };
  }

  async getLiked(type?: "movie" | "tv", page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const results = await db
      .select({
        media: media,
        likedAt: userLikes.likedAt,
      })
      .from(userLikes)
      .innerJoin(media, eq(userLikes.mediaId, media.id))
      .where(eq(userLikes.userId, this.user.id))
      .orderBy(desc(userLikes.likedAt))
      .limit(limit + 1)
      .offset(offset);

    const mapped = results.map((r) => ({ ...r.media, likedAt: r.likedAt }));
    const filtered = type ? mapped.filter((item) => item.type === type) : mapped;

    const hasMore = filtered.length > limit;
    const items = hasMore ? filtered.slice(0, limit) : filtered;

    return {
      results: items,
      page,
      hasMore,
    };
  }

  async isLiked(mediaId: number) {
    const [liked] = await db
      .select()
      .from(userLikes)
      .where(and(eq(userLikes.userId, this.user.id), eq(userLikes.mediaId, mediaId)))
      .limit(1);

    return !!liked;
  }

  async getBatchStatus(mediaIds: number[]) {
    if (mediaIds.length === 0) {
      return [];
    }

    const results = await db
      .select({ mediaId: userLikes.mediaId })
      .from(userLikes)
      .where(and(eq(userLikes.userId, this.user.id), inArray(userLikes.mediaId, mediaIds)));

    return results.map((r) => r.mediaId);
  }
}
