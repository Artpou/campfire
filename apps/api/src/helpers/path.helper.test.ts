import { afterEach, describe, expect, it } from "vitest";

import path from "node:path";
import { assertWithinDownloads, getDownloadsRoot, resolveWithinDownloads } from "./path.helper";

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
});
