import type { ListMediaQuery, UpdateProgressQuery } from "@seedarr/contracts";
import { and, desc, eq, exists, inArray, sql } from "drizzle-orm";

import { BadRequestError, ForbiddenError, NotFoundError } from "@/shared/errors/error";
import { paginate, toPaginate } from "@/shared/helpers/pagination.helper";
import type { Paginate } from "@/shared/helpers/pagination.types";
import { IdentifiableService } from "@/shared/services/authenticated.service";

import { db } from "@/db/db";
import { ROLE_LEVELS } from "@/modules/auth/role.guard";
import { download } from "@/modules/download/download.schema";
import { type MediaInsert, media, userLikes, userWatchList, watchProgress } from "@/modules/media/media.schema";
import { user } from "@/modules/user/user.schema";
import type { MediaEnriched } from "./media.types";

export class MediaService extends IdentifiableService<MediaEnriched> {
  private canSeeAllDownloads(): boolean {
    return this.roleLevel >= ROLE_LEVELS.member;
  }

  private async assertCanViewUserCollection(
    targetUserId: string,
    filter: "like" | "watch-list" | "history",
  ): Promise<void> {
    if (targetUserId === this.user.id) return;

    const target = await db.query.user.findFirst({
      where: eq(user.id, targetUserId),
      columns: { showWatchList: true, showLikes: true, showWatchHistory: true },
    });
    if (!target) throw new NotFoundError("User");

    const allowed =
      filter === "watch-list" ? target.showWatchList : filter === "like" ? target.showLikes : target.showWatchHistory;

    if (!allowed) {
      throw new ForbiddenError("This collection is private");
    }
  }

  async getMany(pagination: Partial<ListMediaQuery>): Promise<MediaEnriched[]> {
    const paginationOpts = pagination.page && pagination.limit ? paginate(pagination) : {};
    const downloadOwnerFilter = this.canSeeAllDownloads() ? undefined : eq(download.userId, this.user.id);

    const rows = await db.query.media.findMany({
      where: pagination.ids ? inArray(media.id, pagination.ids?.map(Number) ?? []) : undefined,
      with: {
        downloads: {
          where: downloadOwnerFilter,
          orderBy: desc(download.createdAt),
          limit: 1,
        },
        progress: { where: eq(watchProgress.userId, this.user.id), limit: 1 },
      },
      extras: (fields) => ({
        liked: sql<boolean>`EXISTS (
          SELECT 1 FROM ${userLikes} WHERE ${userLikes.mediaId} = ${fields.id} AND ${userLikes.userId} = ${this.user.id}
        )`
          .mapWith(Boolean)
          .as("liked"),
        inWatchList: sql<boolean>`EXISTS (
          SELECT 1 FROM ${userWatchList} WHERE ${userWatchList.mediaId} = ${fields.id} AND ${userWatchList.userId} = ${this.user.id}
        )`
          .mapWith(Boolean)
          .as("inWatchList"),
      }),
      ...paginationOpts,
    });

    return rows.map((row) => {
      const { downloads, progress, liked, inWatchList, ...mediaItem } = row;
      return {
        ...mediaItem,
        liked: Boolean(liked),
        inWatchList: Boolean(inWatchList),
        download: downloads[0],
        progress: progress[0] ?? undefined,
      };
    });
  }

  async list(query: ListMediaQuery): Promise<Paginate<MediaEnriched>> {
    const { type, filter, ids, userId } = query;
    const targetUserId = userId ?? this.user.id;

    if (filter === "like" || filter === "watch-list" || filter === "history") {
      await this.assertCanViewUserCollection(targetUserId, filter);
    }

    const conditions = [];
    if (type) conditions.push(eq(media.type, type));
    if (ids) conditions.push(inArray(media.id, ids.map(Number)));

    if (filter) {
      if (filter === "history") {
        conditions.push(
          exists(
            db
              .select()
              .from(watchProgress)
              .where(and(eq(watchProgress.userId, targetUserId), eq(watchProgress.mediaId, media.id))),
          ),
        );
      } else {
        const FILTER_TABLE_MAP = {
          like: userLikes,
          "watch-list": userWatchList,
          downloaded: download,
        } as const;

        const table = FILTER_TABLE_MAP[filter];
        const scopeToUser = filter !== "downloaded" || !this.canSeeAllDownloads();
        const filterUserId = userId ?? (scopeToUser ? this.user.id : undefined);
        conditions.push(
          exists(
            db
              .select()
              .from(table)
              .where(and(filterUserId ? eq(table.userId, filterUserId) : undefined, eq(table.mediaId, media.id))),
          ),
        );
      }
    }

    const mediaIds = (
      await db
        .select({ id: media.id })
        .from(media)
        .where(and(...conditions))
    ).map((m) => m.id.toString());

    return toPaginate(await this.getMany({ ids: mediaIds, ...query }), query);
  }

  async upsert(data: MediaInsert): Promise<MediaEnriched> {
    if (!data.id) throw new BadRequestError("Media ID is required");

    await db.insert(media).values(data).onConflictDoUpdate({ target: media.id, set: data });

    const result = await this.get(data.id.toString());
    if (!result) throw new NotFoundError("Media");
    return result;
  }

  private async _toggle(mode: "like" | "watchlist", data: MediaInsert): Promise<MediaEnriched | undefined> {
    if (!data.id) throw new BadRequestError("Media ID is required");

    const table = mode === "like" ? userLikes : userWatchList;
    const tableQuery = mode === "like" ? db.query.userLikes : db.query.userWatchList;

    const existing = await tableQuery.findFirst({
      columns: { userId: true },
      where: and(eq(table.userId, this.user.id), eq(table.mediaId, data.id)),
    });

    if (existing) {
      await db.delete(table).where(and(eq(table.userId, this.user.id), eq(table.mediaId, data.id)));
    } else {
      const existingMedia = await db.query.media.findFirst({ where: eq(media.id, data.id) });
      if (!existingMedia) await this.upsert(data);

      await db.insert(table).values({ userId: this.user.id, mediaId: data.id });
    }

    return this.get(data.id.toString());
  }

  async toggleLike(data: MediaInsert): Promise<MediaEnriched | undefined> {
    return this._toggle("like", data);
  }

  async toggleWatchList(data: MediaInsert): Promise<MediaEnriched | undefined> {
    return this._toggle("watchlist", data);
  }

  async updateProgress(mediaId: number, input: UpdateProgressQuery): Promise<void> {
    const update = {
      userId: this.user.id,
      downloadId: input.downloadId ?? null,
      position: input.position,
      duration: input.duration,
      completed: input.duration > 0 && input.position / input.duration >= 0.9,
      mediaId,
    };

    await db
      .insert(watchProgress)
      .values(update)
      .onConflictDoUpdate({ target: [watchProgress.userId, watchProgress.mediaId], set: update });
  }
}
