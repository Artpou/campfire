import { desc, eq } from "drizzle-orm";

import { AuthenticatedService } from "@/classes/authenticated-service";
import { db } from "@/db/db";
import { Media, media, userMedia } from "@/db/schema";

export class MediaHistoryService extends AuthenticatedService {
  async track(mediaData: Media) {
    await db.insert(media).values(mediaData).onConflictDoUpdate({
      target: media.id,
      set: mediaData,
    });

    await db
      .insert(userMedia)
      .values({
        userId: this.user.id,
        mediaId: mediaData.id,
        viewedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userMedia.userId, userMedia.mediaId],
        set: { viewedAt: new Date() },
      });

    return { success: true };
  }

  async getRecentlyViewed(type?: "movie" | "tv", page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const results = await db
      .select({
        media: media,
        viewedAt: userMedia.viewedAt,
      })
      .from(userMedia)
      .innerJoin(media, eq(userMedia.mediaId, media.id))
      .where(eq(userMedia.userId, this.user.id))
      .orderBy(desc(userMedia.viewedAt))
      .limit(limit + 1)
      .offset(offset);

    const mapped = results.map((r) => ({ ...r.media, viewedAt: r.viewedAt }));
    const filtered = type ? mapped.filter((item) => item.type === type) : mapped;

    const hasMore = filtered.length > limit;
    const items = hasMore ? filtered.slice(0, limit) : filtered;

    return {
      results: items,
      page,
      hasMore,
    };
  }
}
