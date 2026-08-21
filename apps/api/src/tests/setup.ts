import { vi } from "vitest";

process.env.TMDB_API_KEY ??= "test-tmdb-api-key";
process.env.WEB_URL ??= "http://localhost:3000";

/** Global DB mock — each test sets `testDbRef.current = createTestDb()` in beforeEach. */
vi.mock("@/db/db", async () => {
  const { testDbRef } = await import("./test.helper");
  return {
    get db() {
      return testDbRef.current;
    },
  };
});
