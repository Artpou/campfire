import { and, desc, eq, inArray } from "drizzle-orm";

import { AuthenticatedService } from "@/classes/authenticated-service";
import { db } from "@/db/db";
import { media, torrentDownload, userLikes, userMedia, userWatchList } from "@/db/schema";
import type { Paginate, PaginationParams } from "@/modules/pagination/pagination.dto";
import { toPaginate } from "@/modules/pagination/pagination.helper";
import { Ids } from "@/modules/shared/shared.dto";
import type { ListMediaParams, Media, MediaInsert, MediaStatus, MediaUpdate } from "./media.dto";

export class MediaService extends AuthenticatedService {
  select = db.select().from(media);

  async get(id: number): Promise<Media | null> {
    const [result] = await db.select().from(media).where(eq(media.id, id)).limit(1);
    if (!result) return null;

    const [withStatus] = await this.addStatus([result]);
    return withStatus;
  }

  async list(query: ListMediaParams, pagination: PaginationParams): Promise<Paginate<Media>> {
    const { page, limit, offset } = pagination;
    const { type, filter, ids } = query;

    let results: Media[];

    if (!filter) {
      results = await this.select
        .where(
          and(
            type ? eq(media.type, type) : undefined,
            ids ? inArray(media.id, ids.map(Number)) : undefined,
          ),
        )
        .limit(limit + 1)
        .offset(offset);
    } else {
      const table =
        filter === "like" ? userLikes : filter === "watch-list" ? userWatchList : userMedia;

      const rows = await db
        .select({ media })
        .from(table)
        .innerJoin(media, eq(table.mediaId, media.id))
        .where(and(eq(table.userId, this.user.id), type ? eq(media.type, type) : undefined))
        .orderBy(desc(table.createdAt))
        .limit(limit + 1)
        .offset(offset);
      results = rows.map((r) => r.media);
    }

    const withStatus = await this.addStatus(results);
    return toPaginate(withStatus, page, limit);
  }

  async upsert(data: MediaInsert): Promise<Media> {
    const mediaId = data.id;
    if (!mediaId) throw new Error("Media ID is required");

    await db.insert(media).values(data).onConflictDoUpdate({
      target: media.id,
      set: data,
    });

    // Track view
    await db
      .insert(userMedia)
      .values({
        userId: this.user.id,
        mediaId,
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userMedia.userId, userMedia.mediaId],
        set: { createdAt: new Date() },
      });

    const result = await this.get(mediaId);
    if (!result) throw new Error("Failed to upsert media");
    return result;
  }

  async update(id: number, data: MediaUpdate): Promise<Media | null> {
    await db.update(media).set(data).where(eq(media.id, id));
    return this.get(id);
  }

  async toggleLike(data: Media): Promise<Media> {
    let media = await this.get(data.id);
    if (!media) media = await this.upsert(data);

    const [existing] = await db
      .select()
      .from(userLikes)
      .where(and(eq(userLikes.userId, this.user.id), eq(userLikes.mediaId, data.id)))
      .limit(1);

    if (existing) {
      await db
        .delete(userLikes)
        .where(and(eq(userLikes.userId, this.user.id), eq(userLikes.mediaId, data.id)));
    } else {
      await db.insert(userLikes).values({
        userId: this.user.id,
        mediaId: data.id,
        createdAt: new Date(),
      });
    }

    return { ...media, like: !media.like };
  }

  async toggleWatchList(data: Media): Promise<Media> {
    let media = await this.get(data.id);
    if (!media) media = await this.upsert(data);

    const [existing] = await db
      .select()
      .from(userWatchList)
      .where(and(eq(userWatchList.userId, this.user.id), eq(userWatchList.mediaId, data.id)))
      .limit(1);

    if (existing) {
      await db
        .delete(userWatchList)
        .where(and(eq(userWatchList.userId, this.user.id), eq(userWatchList.mediaId, data.id)));
    } else {
      await db.insert(userWatchList).values({
        userId: this.user.id,
        mediaId: data.id,
        createdAt: new Date(),
      });
    }

    return { ...media, watchList: !media.watchList };
  }

  async listStatus(ids: Ids): Promise<MediaStatus[]> {
    const items = await this.list({ ids }, { limit: ids.length, page: 1, offset: 0 });

    return ids.map((id) => {
      const status = items.results.find((m) => m.id === Number(id));
      return {
        id: Number(id),
        like: status?.like,
        watchList: status?.watchList,
        download: status?.download,
      };
    });
  }

  private async addStatus(items: Media[]): Promise<Media[]> {
    if (items.length === 0) return [];

    const mediaIds = items.map((m) => m.id);

    const [likedRows, watchListRows, downloadRows] = await Promise.all([
      db
        .select({ mediaId: userLikes.mediaId })
        .from(userLikes)
        .where(and(eq(userLikes.userId, this.user.id), inArray(userLikes.mediaId, mediaIds))),
      db
        .select({ mediaId: userWatchList.mediaId })
        .from(userWatchList)
        .where(
          and(eq(userWatchList.userId, this.user.id), inArray(userWatchList.mediaId, mediaIds)),
        ),
      db
        .select({ mediaId: torrentDownload.mediaId })
        .from(torrentDownload)
        .where(
          and(eq(torrentDownload.userId, this.user.id), inArray(torrentDownload.mediaId, mediaIds)),
        ),
    ]);

    const likedSet = new Set(likedRows.map((r) => r.mediaId));
    const watchListSet = new Set(watchListRows.map((r) => r.mediaId));
    const downloadSet = new Set(downloadRows.map((r) => r.mediaId));

    return items.map((item) => ({
      ...item,
      like: likedSet.has(item.id),
      watchList: watchListSet.has(item.id),
      download: downloadSet.has(item.id),
    }));
  }
}
