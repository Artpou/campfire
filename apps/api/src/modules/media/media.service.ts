import { desc, eq } from "drizzle-orm";
import { AuthenticatedService } from "@/classes/authenticated-service";
import { db } from "@/db/db";
import { media, type NewMedia, userMedia } from "@/db/schema";

export class MediaService extends AuthenticatedService {
  private query = db
    .select({
      media: media,
      viewedAt: userMedia.viewedAt,
    })
    .from(userMedia)
    .innerJoin(media, eq(userMedia.mediaId, media.id));

  async track(mediaData: NewMedia) {
    if (!mediaData.id) {
      throw new Error("Media ID is required");
    }

    await db
      .insert(media)
      .values(mediaData)
      .onConflictDoUpdate({
        target: media.id,
        set: {
          title: mediaData.title,
          poster_path: mediaData.poster_path,
          vote_average: mediaData.vote_average,
          release_date: mediaData.release_date,
        },
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

  async getRecentlyViewed(type?: "movie" | "tv", limit = 20) {
    const results = await this.query
      .where(eq(userMedia.userId, this.user.id))
      .orderBy(desc(userMedia.viewedAt))
      .limit(limit);

    const mapped = results.map((r) => ({ ...r.media, viewedAt: r.viewedAt }));

    return type ? mapped.filter((item) => item.type === type) : mapped;
  }
}
