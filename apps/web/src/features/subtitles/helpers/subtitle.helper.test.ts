import type { SubdlSubtitle } from "@seedarr/sdk";
import { describe, expect, it } from "vitest";

import { collectAddedSubtitleLanguages, isMatchingSubtitleRelease, sortSubtitlesByTitleMatch } from "./subtitle.helper";

describe("collectAddedSubtitleLanguages", () => {
  it("detects external and torrent subtitle languages", () => {
    const languages = collectAddedSubtitleLanguages(
      "Movie Title",
      ["Movie Title/Movie Title.FR.srt"],
      ["Movie Title.en.srt", "readme.txt"],
    );

    expect(languages.has("FR")).toBe(true);
    expect(languages.has("EN")).toBe(true);
  });
});

describe("sortSubtitlesByTitleMatch", () => {
  it("puts exact title matches first", () => {
    const subtitles = [
      { release_name: "Other Release", url: "1" },
      { release_name: "Movie Title", url: "2" },
    ] as SubdlSubtitle[];

    expect(sortSubtitlesByTitleMatch(subtitles, "Movie Title")[0]?.url).toBe("2");
  });
});

describe("isMatchingSubtitleRelease", () => {
  it("matches sanitized release names", () => {
    expect(isMatchingSubtitleRelease("Movie: Title", "Movie Title")).toBe(true);
  });
});
