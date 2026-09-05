import type { ListRequestsQuery, RequestStatus } from "@seedarr/contracts";
import { and, asc, count, desc, eq, exists, type SQL, sql } from "drizzle-orm";

import { NotFoundError } from "@/shared/errors/error";

import { db } from "@/db/db";
import { media } from "@/modules/media/media.schema";
import { mediaRequest } from "@/modules/request/request.schema";

const requestRelations = {
  user: { columns: { id: true, username: true, pseudo: true, role: true } },
  media: {
    columns: { id: true, type: true, title: true, poster_path: true, backdrop_path: true, release_date: true },
  },
} as const;

export type RequestEnriched = {
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
};

function listFilters(query: Pick<ListRequestsQuery, "type" | "status">): SQL | undefined {
  const { type, status } = query;
  const conditions: SQL[] = [];

  if (status) conditions.push(eq(mediaRequest.status, status));
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

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export const requestRepository = {
  find: async (id: string) => {
    return (await db.query.mediaRequest.findFirst({ where: eq(mediaRequest.id, id) })) ?? undefined;
  },

  get: async (id: string) => {
    const row = await requestRepository.find(id);
    if (!row) throw new NotFoundError("Request");
    return row;
  },

  findEnriched: async (id: string): Promise<RequestEnriched> => {
    const row = await db.query.mediaRequest.findFirst({
      where: eq(mediaRequest.id, id),
      with: requestRelations,
    });
    if (!row) throw new NotFoundError("Request");
    return row as RequestEnriched;
  },

  findByUserAndMedia: async (userId: string, mediaId: number) => {
    return (
      (await db.query.mediaRequest.findFirst({
        where: and(eq(mediaRequest.userId, userId), eq(mediaRequest.mediaId, mediaId)),
      })) ?? undefined
    );
  },

  insert: async (userId: string, mediaId: number): Promise<RequestEnriched> => {
    const [inserted] = await db.insert(mediaRequest).values({ userId, mediaId }).returning();
    return requestRepository.findEnriched(inserted.id);
  },

  reopenExisting: async (id: string): Promise<RequestEnriched> => {
    await db.update(mediaRequest).set({ status: "pending", dismissed: false }).where(eq(mediaRequest.id, id));
    return requestRepository.findEnriched(id);
  },

  listPage: async (
    query: Pick<ListRequestsQuery, "type" | "status"> & { limit: number; offset: number },
  ): Promise<RequestEnriched[]> => {
    const where = listFilters(query);
    return db.query.mediaRequest.findMany({
      where,
      with: requestRelations,
      orderBy: [asc(mediaRequest.status), desc(mediaRequest.createdAt)],
      limit: query.limit,
      offset: query.offset,
    }) as Promise<RequestEnriched[]>;
  },

  count: async (query: Pick<ListRequestsQuery, "type" | "status">): Promise<number> => {
    const where = listFilters(query);
    const [row] = await db.select({ count: count() }).from(mediaRequest).where(where);
    return row?.count ?? 0;
  },

  listByUser: async (userId: string): Promise<RequestEnriched[]> => {
    return db.query.mediaRequest.findMany({
      where: eq(mediaRequest.userId, userId),
      with: requestRelations,
      orderBy: [asc(mediaRequest.status), desc(mediaRequest.createdAt)],
    }) as Promise<RequestEnriched[]>;
  },

  cancel: async (requestId: string): Promise<void> => {
    await db.update(mediaRequest).set({ status: "cancelled", dismissed: true }).where(eq(mediaRequest.id, requestId));
  },

  validate: async (requestId: string): Promise<void> => {
    await db.update(mediaRequest).set({ status: "validated" }).where(eq(mediaRequest.id, requestId));
  },

  validatePendingByMediaId: async (mediaId: number): Promise<void> => {
    await db
      .update(mediaRequest)
      .set({ status: "validated" })
      .where(and(eq(mediaRequest.mediaId, mediaId), eq(mediaRequest.status, "pending")));
  },

  reopen: async (requestId: string): Promise<void> => {
    await db.update(mediaRequest).set({ status: "pending", dismissed: false }).where(eq(mediaRequest.id, requestId));
  },

  remove: async (requestId: string): Promise<void> => {
    await db.delete(mediaRequest).where(eq(mediaRequest.id, requestId));
  },
};
