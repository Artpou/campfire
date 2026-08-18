import { describe, expect, it } from "vitest";

import {
  buildMediaFolderName,
  buildOrganizedRemotePath,
  buildSeasonFolderName,
  extractYearFromDate,
  joinRemotePath,
  parseSeasonEpisode,
} from "./media-folder";

describe("parseSeasonEpisode", () => {
  it("parses SxxExx from a release name", () => {
    expect(parseSeasonEpisode("Widows Bay S01E08 Your Baggage 1080p")).toEqual({ season: 1, episode: 8 });
  });

  it("parses 1x08 style", () => {
    expect(parseSeasonEpisode("Show.1x08.mkv")).toEqual({ season: 1, episode: 8 });
  });

  it("parses from a remote path", () => {
    expect(
      parseSeasonEpisode("Freebox/Series/Widow's Bay (2026)/Season 01/Widows Bay S01E08 Your Baggage.mkv"),
    ).toEqual({ season: 1, episode: 8 });
  });

  it("returns null when no episode marker is present", () => {
    expect(parseSeasonEpisode("Widow's Bay (2026)/Season 01")).toBeNull();
  });
});

describe("buildOrganizedRemotePath", () => {
  it("builds a movie folder with year", () => {
    expect(buildOrganizedRemotePath({ basePath: "movies", title: "Dune", year: 2021, type: "movie" })).toBe(
      "movies/Dune (2021)",
    );
  });

  it("builds a tv season folder", () => {
    expect(
      buildOrganizedRemotePath({
        basePath: "tv",
        title: "Widow's Bay",
        year: 2026,
        type: "tv",
        season: 1,
      }),
    ).toBe("tv/Widow's Bay (2026)/Season 01");
  });
});

describe("folder helpers", () => {
  it("extracts year and joins paths", () => {
    expect(extractYearFromDate("2026-03-01")).toBe(2026);
    expect(buildMediaFolderName("Show", null)).toBe("Show");
    expect(buildSeasonFolderName(8)).toBe("Season 08");
    expect(joinRemotePath("/tv/", "/Show/", "Season 01")).toBe("tv/Show/Season 01");
  });
});
