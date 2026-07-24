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

const PERSON_DETAILS = {
  id: 1158,
  name: "Al Pacino",
  biography: "Alfredo James Pacino is an American actor.",
  birthday: "1940-04-25",
  deathday: null,
  place_of_birth: "New York City, New York, USA",
  profile_path: "/pacino.jpg",
  known_for_department: "Acting",
  also_known_as: ["Alfredo James Pacino"],
  gender: 2,
  popularity: 50,
  imdb_id: "nm0000199",
  homepage: null,
  combined_credits: {
    cast: [
      {
        id: 238,
        title: "The Godfather",
        original_title: "The Godfather",
        poster_path: "/gf.jpg",
        backdrop_path: "/bg.jpg",
        vote_average: 8.7,
        vote_count: 20000,
        release_date: "1972-03-14",
        overview: "Godfather",
        character: "Michael Corleone",
        media_type: "movie",
        genre_ids: [18],
        popularity: 100,
        credit_id: "c1",
      },
      {
        id: 111,
        title: "Scarface",
        original_title: "Scarface",
        poster_path: "/sf.jpg",
        backdrop_path: null,
        vote_average: 8.1,
        vote_count: 10000,
        release_date: "1983-12-09",
        overview: "Scarface",
        character: "Tony Montana",
        media_type: "movie",
        genre_ids: [28],
        popularity: 80,
        credit_id: "c2",
      },
    ],
    crew: [
      {
        id: 42314,
        title: "Looking for Richard",
        original_title: "Looking for Richard",
        poster_path: "/lr.jpg",
        backdrop_path: null,
        vote_average: 7,
        vote_count: 100,
        release_date: "1996-10-11",
        overview: "Doc",
        department: "Directing",
        job: "Director",
        media_type: "movie",
        genre_ids: [99],
        popularity: 10,
        credit_id: "c3",
      },
    ],
  },
};

const { personRoutes } = await import("./person.route");

describe("Person Routes", () => {
  beforeEach(() => {
    testDbRef.current = createTestDb();
    seedTestUser(testDbRef.current, fakeUser);

    mockFetch.mockImplementation(async (input: string | URL | Request) => {
      const url = input.toString();
      if (url.includes("/person/1158")) return mockResponse(PERSON_DETAILS);
      return new Response("Not Found", { status: 404 });
    });
  });

  it("GET /:id - returns person details with known for and filmography", async () => {
    const body = await bodyOf(await personRoutes.request("/1158?locale=en-US"));
    expect(body.person.name).toBe("Al Pacino");
    expect(body.person.birthday).toBe("1940-04-25");
    expect(body.knownFor.length).toBeGreaterThan(0);
    expect(body.knownFor[0].title).toBe("The Godfather");
    expect(body.filmography.cast).toHaveLength(2);
    expect(body.filmography.crew).toHaveLength(1);
    expect(body.departments).toContain("Directing");
  });
});
