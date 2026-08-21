import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Download } from "@/modules/download/download.schema";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { StreamingSubtitleService } from "./streaming-subtitle.service";

describe("StreamingSubtitleService", () => {
  let tmpRoot: string;
  let previousDownloadsPath: string | undefined;
  const service = new StreamingSubtitleService();

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "seedarr-subs-"));
    previousDownloadsPath = process.env.DOWNLOADS_PATH;
    process.env.DOWNLOADS_PATH = tmpRoot;
  });

  afterEach(async () => {
    process.env.DOWNLOADS_PATH = previousDownloadsPath;
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  const download = (name: string, files: { name: string; path: string; length: number }[] = []): Download =>
    ({
      id: "dl-1",
      userId: "user-1",
      torrent: { name, files },
      createdAt: new Date(),
    }) as Download;

  it("lists external subtitle files not already in torrent metadata", async () => {
    const folder = path.join(tmpRoot, "Movie");
    await fs.mkdir(folder);
    await fs.writeFile(path.join(folder, "Movie.en.srt"), "1\n00:00:01,000 --> 00:00:02,000\nHi\n");
    await fs.writeFile(path.join(folder, "Movie.mkv"), "video");

    const result = await service.listExternalSubtitles(
      download("Movie", [{ name: "Movie.mkv", path: "Movie.mkv", length: 1 }]),
    );

    expect(result.paths).toEqual(["Movie/Movie.en.srt"]);
  });

  it("returns empty paths when download has no folder name", async () => {
    const result = await service.listExternalSubtitles({
      id: "dl-1",
      userId: "u",
      torrent: null,
      remoteLocation: null,
      createdAt: new Date(),
    } as Download);
    expect(result.paths).toEqual([]);
  });

  it("serves SRT normalized as WebVTT", async () => {
    const folder = path.join(tmpRoot, "Movie");
    await fs.mkdir(folder);
    await fs.writeFile(path.join(folder, "Movie.en.srt"), "1\n0:00:01,000 --> 0:00:02,000\nHello\n");

    const { content, contentType } = await service.getSubtitleFile(download("Movie"), "Movie/Movie.en.srt");
    expect(contentType).toContain("text/vtt");
    expect(content).toContain("WEBVTT");
    expect(content).toContain("00:00:01.000");
  });

  it("rejects non-subtitle files", async () => {
    await expect(service.getSubtitleFile(download("Movie"), "Movie/Movie.mkv")).rejects.toThrow(/Only/);
  });

  it("returns 404 for missing subtitle", async () => {
    await expect(service.getSubtitleFile(download("Movie"), "Movie/missing.srt")).rejects.toThrow(/Subtitle/);
  });
});
