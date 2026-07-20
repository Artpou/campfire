import { describe, expect, it } from "vitest";

import { isPlayableDownload, isStreamableVideo, isVideoFile } from "./video";

describe("isStreamableVideo", () => {
  it("accepts progressive containers", () => {
    expect(isStreamableVideo("Movie.2024.1080p.WEB-DL.mp4")).toBe(true);
    expect(isStreamableVideo("clip.m4v")).toBe(true);
    expect(isStreamableVideo("clip.webm")).toBe(true);
  });

  it("rejects mkv and extension-less titles", () => {
    expect(isStreamableVideo("Movie.2024.1080p.BluRay.mkv")).toBe(false);
    expect(isStreamableVideo("Movie.2024.1080p.WEBRip.x264")).toBe(false);
  });
});

describe("isVideoFile", () => {
  it("accepts known video extensions", () => {
    expect(isVideoFile("a.mkv")).toBe(true);
    expect(isVideoFile("a.avi")).toBe(true);
  });
});

describe("isPlayableDownload", () => {
  it("allows incomplete streamable downloads", () => {
    expect(
      isPlayableDownload({
        torrent: { done: false, name: "Movie.mp4", files: [{ name: "Movie.mp4" }] },
      }),
    ).toBe(true);
  });

  it("blocks incomplete mkv downloads", () => {
    expect(
      isPlayableDownload({
        torrent: { done: false, name: "Movie.mkv", files: [{ name: "Movie.mkv" }] },
      }),
    ).toBe(false);
  });

  it("allows completed mkv downloads", () => {
    expect(
      isPlayableDownload({
        torrent: { done: true, name: "Movie.mkv", files: [{ name: "Movie.mkv" }] },
      }),
    ).toBe(true);
  });

  it("allows remote mkv downloads", () => {
    expect(
      isPlayableDownload({
        remoteLocation: "/movies/Movie.mkv",
        torrent: { done: false, name: "Movie.mkv", files: [{ name: "Movie.mkv" }] },
      }),
    ).toBe(true);
  });
});
