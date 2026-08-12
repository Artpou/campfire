import { afterEach, describe, expect, it } from "vitest";

import path from "node:path";
import {
  assertWithinDownloads,
  getDownloadFolderName,
  getDownloadsRoot,
  requireDownloadFolderName,
  resolveWithinDownloads,
} from "./path.helper";

describe("path helper", () => {
  const originalDownloadsPath = process.env.DOWNLOADS_PATH;

  afterEach(() => {
    if (originalDownloadsPath === undefined) {
      delete process.env.DOWNLOADS_PATH;
    } else {
      process.env.DOWNLOADS_PATH = originalDownloadsPath;
    }
  });

  it("resolves paths within downloads root", () => {
    process.env.DOWNLOADS_PATH = "/downloads";
    expect(resolveWithinDownloads("Movie.2024", "video.mkv")).toBe(
      path.resolve("/downloads", "Movie.2024", "video.mkv"),
    );
  });

  it("rejects path traversal via torrent name", () => {
    process.env.DOWNLOADS_PATH = "/downloads";
    expect(() => resolveWithinDownloads("../../etc", "passwd")).toThrow(/escapes download directory/);
  });

  it("rejects path traversal via file segment", () => {
    process.env.DOWNLOADS_PATH = "/downloads";
    expect(() => resolveWithinDownloads("Movie.2024", "../../../etc/passwd")).toThrow(/escapes download directory/);
  });

  it("assertWithinDownloads accepts the root itself", () => {
    process.env.DOWNLOADS_PATH = "/downloads";
    expect(() => assertWithinDownloads(getDownloadsRoot())).not.toThrow();
  });

  it("getDownloadFolderName prefers torrent name", () => {
    expect(getDownloadFolderName({ torrent: { name: "Movie.2024" }, remoteLocation: "movies/Other" })).toBe(
      "Movie.2024",
    );
  });

  it("getDownloadFolderName falls back to remoteLocation basename", () => {
    expect(getDownloadFolderName({ torrent: null, remoteLocation: "movies/Movie.2024/" })).toBe("Movie.2024");
    expect(getDownloadFolderName({ torrent: { name: "  " }, remoteLocation: "tv/Show.S01" })).toBe("Show.S01");
  });

  it("getDownloadFolderName returns undefined when neither is set", () => {
    expect(getDownloadFolderName({ torrent: null, remoteLocation: null })).toBeUndefined();
    expect(getDownloadFolderName({})).toBeUndefined();
  });

  it("requireDownloadFolderName rejects empty names", () => {
    expect(() => requireDownloadFolderName({ torrent: null })).toThrow(/no folder name/);
    expect(() => requireDownloadFolderName({ torrent: { name: "   " } })).toThrow(/no folder name/);
    expect(requireDownloadFolderName({ torrent: { name: "Movie.2024" } })).toBe("Movie.2024");
  });
});
