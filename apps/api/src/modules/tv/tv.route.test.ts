import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAuthGuardMock, seedTestUser } from "@/tests/route-test.helper";
import type { TestDb } from "@/tests/test.helper";
import { bodyOf, createTestDb } from "@/tests/test.helper";

const { fakeUser, testDbRef } = vi.hoisted(() => {
  const fakeUser = { id: "user-1", username: "testuser", role: "member" as const, createdAt: new Date("2024-01-01") };
  const testDbRef = { current: null as TestDb | null };
  return { fakeUser, testDbRef };
});

vi.mock("@/db/db", () => ({
  get db() {
    return testDbRef.current;
  },
}));
vi.mock("@/modules/auth/auth.guard", () => ({
  authGuard: createAuthGuardMock(fakeUser),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const TRENDING_RESULTS = [
  {
    id: 1,
    name: "Show 1",
    original_name: "Show 1",
    backdrop_path: "/bg.jpg",
    poster_path: "/p.jpg",
    overview: "x",
    vote_average: 8.5,
    genre_ids: [18],
  },
  {
    id: 2,
    name: "Show 2",
    original_name: "Show 2",
    backdrop_path: "/bg.jpg",
    poster_path: "/p.jpg",
    overview: "x",
    vote_average: 7,
    genre_ids: [10765],
  },
];

const TV_GENRES = {
  genres: [
    { id: 18, name: "Drama" },
    { id: 10765, name: "Sci-Fi" },
  ],
};

const TV_PROVIDERS = {
  results: [{ provider_id: 1, provider_name: "Netflix", logo_path: "/n.png", display_priorities: { US: 1 } }],
};

const TV_DETAILS = {
  id: 200,
  name: "Breaking Bad",
  original_name: "Breaking Bad",
  poster_path: "/bb.jpg",
  overview: "Chemistry",
  vote_average: 9.5,
  first_air_date: "2008-01-20",
  recommendations: { results: [] },
  credits: { cast: [], crew: [] },
  videos: { results: [] },
  external_ids: {},
  "watch/providers": { results: {} },
};

const { tvRoutes } = await import("./tv.route");

describe("TV Routes", () => {
  beforeEach(() => {
    testDbRef.current = createTestDb();
    seedTestUser(testDbRef.current, fakeUser);

    mockFetch.mockImplementation(async (input: string | URL | Request) => {
      const url = input.toString();

      if (url.includes("/discover/tv")) return mockResponse({ results: TRENDING_RESULTS, page: 1, total_pages: 1 });
      if (url.includes("/genre/tv/list")) return mockResponse(TV_GENRES);
      if (url.includes("/search/multi"))
        return mockResponse({
          results: [{ id: 60, name: "Found TV", original_name: "Found TV", media_type: "tv", poster_path: "/s.jpg" }],
        });
      if (url.includes("/search/keyword")) return mockResponse({ results: [{ id: 1, name: "drama" }] });
      if (url.includes("/watch/providers/tv")) return mockResponse(TV_PROVIDERS);
      if (url.includes("/tv/200/season/1"))
        return mockResponse({ season_number: 1, episodes: [{ id: 1, name: "Pilot" }] });
      if (url.includes("/tv/200")) return mockResponse(TV_DETAILS);
      if (url.includes("imdb.iamidiotareyoutoo.com")) return mockResponse({ description: [] });

      return new Response("Not Found", { status: 404 });
    });
  });

  it("GET /trending - returns trending shows", async () => {
    const body = await bodyOf(await tvRoutes.request("/trending?locale=en-US"));
    expect(body).toHaveLength(2);
    expect(body[0].title).toBe("Show 1");
  });

  it("GET /discover - returns paginated results", async () => {
    mockFetch.mockImplementation(async (input: string | URL | Request) => {
      const url = input.toString();
      if (url.includes("/discover/tv"))
        return mockResponse({
          results: [
            {
              id: 10,
              name: "Discover",
              original_name: "Discover",
              poster_path: "/d.jpg",
              overview: "x",
              vote_average: 6,
              genre_ids: [18],
            },
          ],
          page: 1,
          total_pages: 3,
        });
      if (url.includes("/genre/tv/list")) return mockResponse(TV_GENRES);
      return new Response("Not Found", { status: 404 });
    });

    const body = await bodyOf(await tvRoutes.request("/discover?locale=en-US&page=1"));
    expect(body).toMatchObject({ totalPages: 3 });
    expect(body.results).toHaveLength(1);
  });

  it("GET /:id - returns details and upserts media", async () => {
    const body = await bodyOf(await tvRoutes.request("/200?locale=en-US"));
    expect(body.tv).toBeDefined();
    expect(body.media).toMatchObject({ id: 200, title: "Breaking Bad" });
  });

  it("GET /search - returns results", async () => {
    const body = await bodyOf(await tvRoutes.request("/search?q=drama&locale=en-US"));
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe("Found TV");
  });

  it("GET /keywords - returns keyword results", async () => {
    const body = await bodyOf(await tvRoutes.request("/keywords?q=drama"));
    expect(body[0].name).toBe("drama");
  });

  it("GET /:id/season/:number - returns season", async () => {
    const body = await bodyOf(await tvRoutes.request("/200/season/1?locale=en-US"));
    expect(body).toMatchObject({ season_number: 1 });
    expect(body.episodes).toHaveLength(1);
  });

  it("GET /genres - returns genres", async () => {
    const body = await bodyOf(await tvRoutes.request("/genres?locale=en-US"));
    expect(body.genres).toHaveLength(2);
  });

  it("GET /providers - returns providers", async () => {
    const body = await bodyOf(await tvRoutes.request("/providers?locale=en-US"));
    expect(body).toHaveLength(1);
    expect(body[0].provider_name).toBe("Netflix");
  });
});
