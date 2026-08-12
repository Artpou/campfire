import type { ListRequestsQuery, MediaInput, RequestStatus } from "@seedarr/contracts";
import { and, asc, desc, eq, exists, sql } from "drizzle-orm";

import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/shared/errors/error";
import { paginate, toPaginate } from "@/shared/helpers/pagination.helper";
import type { Paginate } from "@/shared/helpers/pagination.types";
import { AuthenticatedService } from "@/shared/services/authenticated.service";

import { db } from "@/db/db";
import { ROLE_LEVELS } from "@/modules/auth/role.guard";
import { type MediaInsert, media } from "@/modules/media/media.schema";
import { mediaRequest } from "./request.schema";

export interface RequestWithUser {
  id: string;
  userId: string;
  mediaId: number;
  dismissed: boolean;
  status: RequestStatus;
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
    if (existing && existing.status === "pending") throw new ConflictError("Request already exists");

    if (existing) {
      await db
        .update(mediaRequest)
        .set({ status: "pending", dismissed: false })
        .where(eq(mediaRequest.id, existing.id));
      return this._enrichOne(existing.id);
    }

    const [inserted] = await db.insert(mediaRequest).values({ userId: this.user.id, mediaId: input.id }).returning();
    return this._enrichOne(inserted.id);
  }

  async list(query: ListRequestsQuery): Promise<Paginate<RequestWithUser>> {
    const { type, status, page = 1, limit = 20 } = query;
    const paginationOpts = paginate({ page, limit });

    const conditions = [];

    if (status) {
      conditions.push(eq(mediaRequest.status, status));
    }

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
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        user: { columns: { id: true, username: true, pseudo: true, role: true } },
        media: {
          columns: { id: true, type: true, title: true, poster_path: true, backdrop_path: true, release_date: true },
        },
      },
      orderBy: [asc(mediaRequest.status), desc(mediaRequest.createdAt)],
      ...paginationOpts,
    });

    return toPaginate(rows as RequestWithUser[], { page, limit });
  }

  async listByUser(userId: string): Promise<RequestWithUser[]> {
    return db.query.mediaRequest.findMany({
      where: eq(mediaRequest.userId, userId),
      with: {
        user: { columns: { id: true, username: true, pseudo: true, role: true } },
        media: {
          columns: { id: true, type: true, title: true, poster_path: true, backdrop_path: true, release_date: true },
        },
      },
      orderBy: [asc(mediaRequest.status), desc(mediaRequest.createdAt)],
    }) as Promise<RequestWithUser[]>;
  }

  async cancel(requestId: string): Promise<void> {
    if (this.roleLevel < ROLE_LEVELS.admin) throw new ForbiddenError();
    const request = await db.query.mediaRequest.findFirst({ where: eq(mediaRequest.id, requestId) });
    if (!request) throw new NotFoundError("Request");
    await db.update(mediaRequest).set({ status: "cancelled", dismissed: true }).where(eq(mediaRequest.id, requestId));
  }

  async validate(requestId: string): Promise<void> {
    const request = await db.query.mediaRequest.findFirst({ where: eq(mediaRequest.id, requestId) });
    if (!request) throw new NotFoundError("Request");
    await db.update(mediaRequest).set({ status: "validated" }).where(eq(mediaRequest.id, requestId));
  }

  async validateByMedia(mediaId: number): Promise<void> {
    await db
      .update(mediaRequest)
      .set({ status: "validated" })
      .where(and(eq(mediaRequest.mediaId, mediaId), eq(mediaRequest.status, "pending")));
  }

  async reopen(requestId: string): Promise<void> {
    const request = await db.query.mediaRequest.findFirst({ where: eq(mediaRequest.id, requestId) });
    if (!request) throw new NotFoundError("Request");
    if (request.status !== "cancelled") throw new BadRequestError("Only cancelled requests can be reopened");
    await db.update(mediaRequest).set({ status: "pending", dismissed: false }).where(eq(mediaRequest.id, requestId));
  }

  async remove(requestId: string): Promise<void> {
    const request = await db.query.mediaRequest.findFirst({ where: eq(mediaRequest.id, requestId) });
    if (!request) throw new NotFoundError("Request");
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
