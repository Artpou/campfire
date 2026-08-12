import type { Torrent } from "@seedarr/sdk";
import { describe, expect, it } from "vitest";

import { getSeasonEpisodeRelevance } from "./torrent-sort.helper";

function makeTorrent(mediaInfos: Torrent["mediaInfos"] | Record<string, unknown>): Torrent {
  return {
    title: "Show S02E05 1080p",
    tracker: "Tracker",
    size: 1000,
    publishDate: "2024-01-01",
    seeders: 10,
    peers: 5,
    link: "http://example.com",
    guid: "guid",
    indexerType: "jackett",
    mediaInfos: mediaInfos as Torrent["mediaInfos"],
  };
}

describe("getSeasonEpisodeRelevance", () => {
  it("returns 0 when no season filter is provided", () => {
    expect(getSeasonEpisodeRelevance(makeTorrent({ isTv: true, seasons: [2], episodeNumbers: [5] }))).toBe(0);
  });

  it("returns 0 for non-tv / missing media infos", () => {
    expect(getSeasonEpisodeRelevance(makeTorrent(null as never), 2, 5)).toBe(0);
    expect(getSeasonEpisodeRelevance(makeTorrent({ isTv: false }), 2, 5)).toBe(0);
    expect(getSeasonEpisodeRelevance(makeTorrent({ isTv: true, seasons: [] }), 2)).toBe(0);
  });

  it("returns 3 for exact season and episode match", () => {
    expect(getSeasonEpisodeRelevance(makeTorrent({ isTv: true, seasons: [2], episodeNumbers: [5] }), 2, 5)).toBe(3);
  });

  it("returns 2 for full season packs when filtering by episode", () => {
    expect(
      getSeasonEpisodeRelevance(makeTorrent({ isTv: true, seasons: [2], episodeNumbers: [], fullSeason: true }), 2, 5),
    ).toBe(2);
  });

  it("returns 1 for other episodes in the same season", () => {
    expect(getSeasonEpisodeRelevance(makeTorrent({ isTv: true, seasons: [2], episodeNumbers: [1] }), 2, 5)).toBe(1);
  });

  it("returns 2 for season packs without episode filter", () => {
    expect(
      getSeasonEpisodeRelevance(makeTorrent({ isTv: true, seasons: [2], episodeNumbers: [], fullSeason: true }), 2),
    ).toBe(2);
  });

  it("returns -1 when the torrent season does not match", () => {
    expect(getSeasonEpisodeRelevance(makeTorrent({ isTv: true, seasons: [1], episodeNumbers: [1] }), 2, 5)).toBe(-1);
  });
});
