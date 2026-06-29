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
    title: "Trending 1",
    original_title: "Trending 1",
    backdrop_path: "/bg.jpg",
    poster_path: "/p.jpg",
    overview: "x",
    vote_average: 8,
    genre_ids: [28],
  },
  {
    id: 2,
    title: "Trending 2",
    original_title: "Trending 2",
    backdrop_path: "/bg.jpg",
    poster_path: "/p.jpg",
    overview: "x",
    vote_average: 7,
    genre_ids: [12],
  },
];

const DISCOVER_RESULTS = [
  {
    id: 10,
    title: "Discover 1",
    original_title: "Discover 1",
    poster_path: "/d.jpg",
    overview: "x",
    vote_average: 6,
    genre_ids: [28],
  },
];

const MOVIE_DETAILS = {
  id: 100,
  title: "Detail Movie",
  original_title: "Detail Movie",
  poster_path: "/x.jpg",
  overview: "Great",
  vote_average: 9,
  release_date: "2024-06-01",
  alternative_titles: { titles: [] },
  recommendations: { results: [] },
  credits: { cast: [], crew: [] },
  videos: { results: [] },
  external_ids: {},
  release_dates: { results: [] },
  "watch/providers": { results: {} },
};

const GENRES = {
  genres: [
    { id: 28, name: "Action" },
    { id: 12, name: "Adventure" },
  ],
};

const PROVIDERS = {
  results: [
    { provider_id: 1, provider_name: "Netflix", logo_path: "/n.png", display_priorities: { US: 1 } },
    { provider_id: 2, provider_name: "Disney+", logo_path: "/d.png", display_priorities: { US: 2 } },
  ],
};

const { movieRoutes } = await import("./movie.route");

describe("Movie Routes", () => {
  beforeEach(() => {
    testDbRef.current = createTestDb();
    seedTestUser(testDbRef.current, fakeUser);

    mockFetch.mockImplementation(async (input: string | URL | Request) => {
      const url = input.toString();

      if (url.includes("/discover/movie")) return mockResponse({ results: TRENDING_RESULTS, page: 1, total_pages: 1 });
      if (url.includes("/genre/movie/list")) return mockResponse(GENRES);
      if (url.includes("/search/multi"))
        return mockResponse({
          results: [{ id: 50, title: "Found", original_title: "Found", media_type: "movie", poster_path: "/s.jpg" }],
        });
      if (url.includes("/search/keyword")) return mockResponse({ results: [{ id: 1, name: "action" }] });
      if (url.includes("/watch/providers/movie")) return mockResponse(PROVIDERS);
      if (url.includes("/movie/100")) return mockResponse(MOVIE_DETAILS);
      if (url.includes("/collection/")) return mockResponse({ parts: [] });
      if (url.includes("imdb.iamidiotareyoutoo.com")) return mockResponse({ description: [] });

      return new Response("Not Found", { status: 404 });
    });
  });

  it("GET /trending - returns trending movies", async () => {
    const body = await bodyOf(await movieRoutes.request("/trending?locale=en-US"));
    expect(body).toHaveLength(2);
    expect(body[0].title).toBe("Trending 1");
  });

  it("GET /discover - returns paginated results", async () => {
    mockFetch.mockImplementation(async (input: string | URL | Request) => {
      const url = input.toString();
      if (url.includes("/discover/movie")) return mockResponse({ results: DISCOVER_RESULTS, page: 1, total_pages: 5 });
      if (url.includes("/genre/movie/list")) return mockResponse(GENRES);
      return new Response("Not Found", { status: 404 });
    });

    const body = await bodyOf(await movieRoutes.request("/discover?locale=en-US&page=1"));
    expect(body).toMatchObject({ page: 1, totalPages: 5 });
    expect(body.results).toHaveLength(1);
  });

  it("GET /:id - returns details and upserts to DB", async () => {
    const body = await bodyOf(await movieRoutes.request("/100?locale=en-US"));
    expect(body.movie).toBeDefined();
    expect(body.media).toMatchObject({ id: 100, title: "Detail Movie" });
  });

  it("GET /search - returns results", async () => {
    const body = await bodyOf(await movieRoutes.request("/search?q=test&locale=en-US"));
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe("Found");
  });

  it("GET /keywords - returns keyword results", async () => {
    const body = await bodyOf(await movieRoutes.request("/keywords?q=action"));
    expect(body[0].name).toBe("action");
  });

  it("GET /genres - returns genre list", async () => {
    const body = await bodyOf(await movieRoutes.request("/genres?locale=en-US"));
    expect(body.genres).toHaveLength(2);
  });

  it("GET /providers - returns provider list", async () => {
    const body = await bodyOf(await movieRoutes.request("/providers?locale=en-US"));
    expect(body).toHaveLength(2);
    expect(body[0].provider_name).toBe("Netflix");
  });
});
