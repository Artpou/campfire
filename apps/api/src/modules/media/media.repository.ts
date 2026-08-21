import { eq, inArray } from "drizzle-orm";

import { BadRequestError, NotFoundError } from "@/shared/errors/error";

import { db } from "@/db/db";
import type { MediaInsert } from "@/modules/media/media.schema";
import { media } from "@/modules/media/media.schema";

export const mediaRepository = {
  find: async (id: number) => await db.query.media.findFirst({ where: eq(media.id, id) }),
  get: async (id: number) => {
    const result = await mediaRepository.find(id);
    if (!result) throw new NotFoundError("Media");
    return result;
  },
  exists: async (id: number) => {
    const exists = await db.query.media.findFirst({ columns: { id: true }, where: eq(media.id, id) });
    return exists != null;
  },
  findManyByIds: async (ids: number[]) => {
    if (ids.length === 0) return [];
    return db
      .select({ id: media.id, duration: media.duration, categories: media.categories })
      .from(media)
      .where(inArray(media.id, ids));
  },
  upsert: async (data: MediaInsert) => {
    if (!data.id) throw new BadRequestError("Media ID is required");

    const [inserted] = await db
      .insert(media)
      .values(data)
      .onConflictDoUpdate({ target: media.id, set: data })
      .returning();
    if (!inserted) throw new NotFoundError("Media");

    return inserted;
  },
};
