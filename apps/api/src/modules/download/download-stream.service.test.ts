import { afterEach, describe, expect, it } from "vitest";

import type { Download } from "./download.dto";
import { DownloadStreamService } from "./download-stream.service";

describe("DownloadStreamService path safety", () => {
  const originalDownloadsPath = process.env.DOWNLOADS_PATH;
  const service = new DownloadStreamService();
  const download = {
    torrent: { name: "Movie.2024" },
  } as Download;

  afterEach(() => {
    if (originalDownloadsPath === undefined) {
      delete process.env.DOWNLOADS_PATH;
    } else {
      process.env.DOWNLOADS_PATH = originalDownloadsPath;
    }
  });

  it("getFile rejects path traversal in file segment", () => {
    process.env.DOWNLOADS_PATH = "/downloads";
    expect(() => service.getFile(download, encodeURIComponent("../../../etc/passwd"))).toThrow(
      /escapes download directory/,
    );
  });

  it("getSubtitleVtt rejects path traversal in file segment", async () => {
    process.env.DOWNLOADS_PATH = "/downloads";
    await expect(service.getSubtitleVtt(download, encodeURIComponent("../../secret.srt"))).rejects.toThrow(
      /escapes download directory/,
    );
  });
});
