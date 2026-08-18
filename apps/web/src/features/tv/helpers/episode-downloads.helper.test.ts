import type { Download } from "@seedarr/sdk";
import { describe, expect, it } from "vitest";

import { buildEpisodeDownloadMap, getEpisodesCoveredByDownload } from "./episode-downloads.helper";

function makeDownload(overrides: Partial<Download> = {}): Download {
  return {
    id: "download-1",
    userId: "user-1",
    mediaId: 123,
    origin: null,
    quality: null,
    language: null,
    createdAt: new Date("2024-01-01"),
    remoteLocation: null,
    error: null,
    torrent: {
      infoHash: "abc",
      magnetURI: "magnet:?xt=urn:btih:abc",
      announce: [],
      timeRemaining: 0,
      received: 0,
      downloaded: 0,
      uploaded: 0,
      downloadSpeed: 0,
      uploadSpeed: 0,
      progress: 1,
      ratio: 0,
      length: 1000,
      pieceLength: 524288,
      lastPieceLength: 0,
      numPeers: 0,
      path: "./downloads",
      ready: true,
      paused: false,
      done: true,
      name: "Show.S02E05.1080p",
      maxWebConns: 4,
      files: [],
    },
    ...overrides,
  } as Download;
}

describe("buildEpisodeDownloadMap", () => {
  it("maps single episode downloads from torrent name", () => {
    const map = buildEpisodeDownloadMap([makeDownload()]);

    expect(map.get("2-5")?.id).toBe("download-1");
  });

  it("maps season pack files to multiple episodes", () => {
    const baseTorrent = makeDownload().torrent;
    if (!baseTorrent) throw new Error("Expected torrent data");

    const map = buildEpisodeDownloadMap([
      makeDownload({
        id: "season-pack",
        torrent: {
          ...baseTorrent,
          name: "Show.Season.02.Complete",
          files: [
            { name: "Show.S02E01.mkv", path: "Show.S02E01.mkv", length: 100, downloaded: 100, progress: 1 },
            { name: "Show.S02E02.mkv", path: "Show.S02E02.mkv", length: 100, downloaded: 100, progress: 1 },
          ],
        },
      }),
    ]);

    expect(map.get("2-1")?.id).toBe("season-pack");
    expect(map.get("2-2")?.id).toBe("season-pack");
  });

  it("maps remote file paths when torrent data is missing", () => {
    const map = buildEpisodeDownloadMap(
      [
        makeDownload({
          id: "remote-show",
          torrent: null,
          remoteLocation: "Freebox/Series/Widow's Bay (2026)",
        }),
      ],
      new Map([
        [
          "remote-show",
          [
            {
              name: "Widows Bay S01E08 Your Baggage 1080p.mkv",
              path: "Freebox/Series/Widow's Bay (2026)/Season 01/Widows Bay S01E08 Your Baggage 1080p.mkv",
            },
          ],
        ],
      ]),
    );

    expect(map.get("1-8")?.id).toBe("remote-show");
  });
});

describe("getEpisodesCoveredByDownload", () => {
  it("returns every episode mapped to a season pack download", () => {
    const baseTorrent = makeDownload().torrent;
    if (!baseTorrent) throw new Error("Expected torrent data");

    const map = buildEpisodeDownloadMap([
      makeDownload({
        id: "season-pack",
        torrent: {
          ...baseTorrent,
          name: "Show.Season.02.Complete",
          files: [
            { name: "Show.S02E01.mkv", path: "Show.S02E01.mkv", length: 100, downloaded: 100, progress: 1 },
            { name: "Show.S02E03.mkv", path: "Show.S02E03.mkv", length: 100, downloaded: 100, progress: 1 },
            { name: "Show.S02E02.mkv", path: "Show.S02E02.mkv", length: 100, downloaded: 100, progress: 1 },
          ],
        },
      }),
    ]);

    expect(getEpisodesCoveredByDownload("season-pack", map)).toEqual([
      { season: 2, episode: 1 },
      { season: 2, episode: 2 },
      { season: 2, episode: 3 },
    ]);
  });

  it("returns a single episode for a single-episode download", () => {
    const map = buildEpisodeDownloadMap([makeDownload()]);

    expect(getEpisodesCoveredByDownload("download-1", map)).toEqual([{ season: 2, episode: 5 }]);
  });
});
