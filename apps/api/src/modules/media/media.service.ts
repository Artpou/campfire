import { and, desc, eq, exists, inArray } from "drizzle-orm";

import type { Paginate } from "@/shared/pagination.dto";
import { paginate, toPaginate } from "@/shared/pagination.helper";

import { db } from "@/db/db";
import { BadRequestError, NotFoundError } from "@/errors/error";
import { countSubquery } from "@/helpers/drizzle.helper";
import { IdentifiableService } from "@/modules/auth/auth.service";
import { torrentDownload } from "@/modules/download/download.schema";
import { media, userLikes, userMedia, userWatchList, watchProgress } from "@/modules/media/media.schema";
import type { ListMediaQuery, Media, MediaInsert, UpdateProgressQuery } from "./media.dto";

export class MediaService extends IdentifiableService<Media> {
  async getMany(pagination: Partial<ListMediaQuery>): Promise<Media[]> {
    const paginationOpts = pagination.page && pagination.limit ? paginate(pagination) : {};
    const rows = await db.query.media.findMany({
      where: inArray(media.id, pagination.ids?.map(Number) ?? []),
      with: {
        downloads: {
          where: and(eq(torrentDownload.userId, this.user.id)),
          orderBy: desc(torrentDownload.completedAt),
          limit: 1,
        },
        progress: { where: eq(watchProgress.userId, this.user.id), limit: 1 },
      },
      extras: (fields) => ({
        likes: countSubquery(userLikes, userLikes.mediaId, fields.id, "likes"),
        watchList: countSubquery(userWatchList, userWatchList.mediaId, fields.id, "watchList"),
      }),
      ...paginationOpts,
    });

    return rows.map((row) => {
      const { downloads, progress, ...mediaItem } = row;
      return {
        ...mediaItem,
        download: downloads[0] ?? undefined,
        progress: progress[0] ?? undefined,
      };
    });
  }

  async list(query: ListMediaQuery): Promise<Paginate<Media>> {
    const { type, filter, ids } = query;

    const conditions = [];
    if (type) conditions.push(eq(media.type, type));
    if (ids) conditions.push(inArray(media.id, ids.map(Number)));

    if (filter) {
      const FILTER_TABLE_MAP = {
        like: userLikes,
        "watch-list": userWatchList,
        "recently-viewed": userMedia,
        downloaded: torrentDownload,
      } as const;

      const table = FILTER_TABLE_MAP[filter];
      conditions.push(
        exists(
          db
            .select()
            .from(table)
            .where(and(eq(table.userId, this.user.id), eq(table.mediaId, media.id))),
        ),
      );
    }

    const mediaIds = (
      await db
        .select({ id: media.id })
        .from(media)
        .where(and(...conditions))
    ).map((m) => m.id.toString());

    return toPaginate(await this.getMany({ ids: mediaIds, ...query }), query);
  }

  async upsert(data: MediaInsert): Promise<Media> {
    if (!data.id) throw new BadRequestError("Media ID is required");

    await db.insert(media).values(data).onConflictDoUpdate({ target: media.id, set: data });
    await db
      .insert(userMedia)
      .values({ userId: this.user.id, mediaId: data.id, createdAt: new Date() })
      .onConflictDoUpdate({
        target: [userMedia.userId, userMedia.mediaId],
        set: { createdAt: new Date() },
      });

    const result = await this.get(data.id.toString());
    if (!result) throw new NotFoundError("Media");
    return result;
  }

  async toggleLike(mediaId: number): Promise<Media | undefined> {
    const existing = await db.query.userLikes.findFirst({
      columns: { userId: true },
      where: and(eq(userLikes.userId, this.user.id), eq(userLikes.mediaId, mediaId)),
    });

    existing
      ? await db.delete(userLikes).where(and(eq(userLikes.userId, this.user.id), eq(userLikes.mediaId, mediaId)))
      : await db.insert(userLikes).values({ userId: this.user.id, mediaId });

    return this.get(mediaId.toString());
  }

  async toggleWatchList(mediaId: number): Promise<Media | undefined> {
    const existing = await db.query.userWatchList.findFirst({
      columns: { userId: true },
      where: and(eq(userWatchList.userId, this.user.id), eq(userWatchList.mediaId, mediaId)),
    });

    existing
      ? await db
          .delete(userWatchList)
          .where(and(eq(userWatchList.userId, this.user.id), eq(userWatchList.mediaId, mediaId)))
      : await db.insert(userWatchList).values({ userId: this.user.id, mediaId });

    return this.get(mediaId.toString());
  }

  async updateProgress(mediaId: number, input: UpdateProgressQuery): Promise<Media | undefined> {
    const update = {
      userId: this.user.id,
      downloadId: input.downloadId ?? null,
      position: input.position,
      duration: input.duration,
      completed: input.duration > 0 && input.position / input.duration >= 0.9,
    };

    await db
      .insert(watchProgress)
      .values({ ...update, mediaId })
      .onConflictDoUpdate({ target: [watchProgress.userId, watchProgress.mediaId], set: update });

    return this.get(mediaId.toString());
  }

  async clearHistory(): Promise<{ success: true }> {
    await db.delete(userMedia).where(eq(userMedia.userId, this.user.id));
    return { success: true };
  }
}
