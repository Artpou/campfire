import type { ListRequestsQuery, MediaInput } from "@seedarr/contracts";
import { and, desc, eq, exists, notExists, sql } from "drizzle-orm";

import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/shared/errors/error";
import { paginate, toPaginate } from "@/shared/helpers/pagination.helper";
import type { Paginate } from "@/shared/helpers/pagination.types";
import { AuthenticatedService } from "@/shared/services/authenticated.service";

import { db } from "@/db/db";
import { ROLE_LEVELS } from "@/modules/auth/role.guard";
import { download } from "@/modules/download/download.schema";
import { type MediaInsert, media } from "@/modules/media/media.schema";
import { mediaRequest } from "./request.schema";

export interface RequestWithUser {
  id: string;
  userId: string;
  mediaId: number;
  dismissed: boolean;
  createdAt: Date;
  user: { id: string; username: string; pseudo: string | null; role: string };
  media: {
    id: number;
    type: string;
    title: string;
    poster_path: string | null;
    backdrop_path: string | null;
    release_date: string | null;
  };
}

export class RequestService extends AuthenticatedService {
  async create(input: MediaInput): Promise<RequestWithUser> {
    if (!input.id) throw new BadRequestError("Media ID is required");

    const hasDownload = await db.query.download.findFirst({
      where: eq(download.mediaId, input.id),
      columns: { id: true },
    });
    if (hasDownload) throw new ConflictError("Media already has a download");

    const existingMedia = await db.query.media.findFirst({ where: eq(media.id, input.id) });
    if (!existingMedia) {
      await db
        .insert(media)
        .values(input as MediaInsert)
        .onConflictDoUpdate({ target: media.id, set: input as MediaInsert });
    }

    const existing = await db.query.mediaRequest.findFirst({
      where: and(eq(mediaRequest.userId, this.user.id), eq(mediaRequest.mediaId, input.id)),
    });
    if (existing) throw new ConflictError("Request already exists");

    const [inserted] = await db.insert(mediaRequest).values({ userId: this.user.id, mediaId: input.id }).returning();

    return this._enrichOne(inserted.id);
  }

  async list(query: ListRequestsQuery): Promise<Paginate<RequestWithUser>> {
    const { type, page = 1, limit = 20 } = query;
    const paginationOpts = paginate({ page, limit });

    const conditions = [
      eq(mediaRequest.dismissed, false),
      notExists(db.select({ _: sql`1` }).from(download).where(eq(download.mediaId, mediaRequest.mediaId))),
    ];

    if (type) {
      conditions.push(
        exists(
          db
            .select({ _: sql`1` })
            .from(media)
            .where(and(eq(media.id, mediaRequest.mediaId), eq(media.type, type))),
        ),
      );
    }

    const rows = await db.query.mediaRequest.findMany({
      where: and(...conditions),
      with: {
        user: { columns: { id: true, username: true, pseudo: true, role: true } },
        media: {
          columns: { id: true, type: true, title: true, poster_path: true, backdrop_path: true, release_date: true },
        },
      },
      orderBy: desc(mediaRequest.createdAt),
      ...paginationOpts,
    });

    return toPaginate(rows as RequestWithUser[], { page, limit });
  }

  async listByUser(userId: string): Promise<RequestWithUser[]> {
    const conditions = [
      eq(mediaRequest.userId, userId),
      eq(mediaRequest.dismissed, false),
      notExists(db.select({ _: sql`1` }).from(download).where(eq(download.mediaId, mediaRequest.mediaId))),
    ];

    return db.query.mediaRequest.findMany({
      where: and(...conditions),
      with: {
        user: { columns: { id: true, username: true, pseudo: true, role: true } },
        media: {
          columns: { id: true, type: true, title: true, poster_path: true, backdrop_path: true, release_date: true },
        },
      },
      orderBy: desc(mediaRequest.createdAt),
    }) as Promise<RequestWithUser[]>;
  }

  async dismiss(requestId: string): Promise<void> {
    if (this.roleLevel < ROLE_LEVELS.admin) throw new ForbiddenError();

    const request = await db.query.mediaRequest.findFirst({ where: eq(mediaRequest.id, requestId) });
    if (!request) throw new NotFoundError("Request");

    await db.update(mediaRequest).set({ dismissed: true }).where(eq(mediaRequest.id, requestId));
  }

  async remove(requestId: string): Promise<void> {
    const request = await db.query.mediaRequest.findFirst({ where: eq(mediaRequest.id, requestId) });
    if (!request) throw new NotFoundError("Request");

    const isOwner = request.userId === this.user.id;
    if (!isOwner && this.roleLevel < ROLE_LEVELS.admin) throw new ForbiddenError();

    await db.delete(mediaRequest).where(eq(mediaRequest.id, requestId));
  }

  private async _enrichOne(requestId: string): Promise<RequestWithUser> {
    const row = await db.query.mediaRequest.findFirst({
      where: eq(mediaRequest.id, requestId),
      with: {
        user: { columns: { id: true, username: true, pseudo: true, role: true } },
        media: {
          columns: { id: true, type: true, title: true, poster_path: true, backdrop_path: true, release_date: true },
        },
      },
    });
    if (!row) throw new NotFoundError("Request");
    return row as RequestWithUser;
  }
}
