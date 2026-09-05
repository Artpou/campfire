import { beforeEach, describe, expect, it } from "vitest";

import { media, userLikes } from "@/modules/media/media.schema";
import { listEnrichedMedia } from "@/modules/media/media-list.repository";
import { user } from "@/modules/user/user.schema";
import { createTestDb, testDbRef } from "@/tests/test.helper";

describe("media-list.repository", () => {
  beforeEach(() => {
    testDbRef.current = createTestDb();
    testDbRef.current
      .insert(user)
      .values({ id: "u1", username: "alice", password: "x", role: "member", createdAt: new Date() })
      .run();
    testDbRef.current
      .insert(media)
      .values([
        { id: 1, type: "movie", title: "Alpha", imdbId: "tt1", vote_average: 8 },
        { id: 2, type: "movie", title: "Beta", imdbId: "tt2", vote_average: 5 },
        { id: 3, type: "tv", title: "Gamma Show", imdbId: "tt3", vote_average: 7 },
      ])
      .run();
    testDbRef.current.insert(userLikes).values({ userId: "u1", mediaId: 1, createdAt: new Date() }).run();
  });

  it("filters by type", async () => {
    const movies = await listEnrichedMedia("u1", { type: "movie" });
    expect(movies.map((m) => m.id)).toEqual([1, 2]);
  });

  it("filters likes for user", async () => {
    const liked = await listEnrichedMedia("u1", { filter: "like" });
    expect(liked.map((m) => m.id)).toEqual([1]);
  });

  it("filters by minimum vote average", async () => {
    const results = await listEnrichedMedia("u1", { vote_average_gte: 7 });
    expect(results.map((m) => m.id)).toEqual([1, 3]);
  });
});
