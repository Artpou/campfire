import { describe, expect, it, vi } from "vitest";

import { buildSubtitleTracks, resolveSubtitleTracksToBlobs } from "./subtitle-tracks.helper";

describe("subtitle-tracks.helper", () => {
  it("builds tracks from torrent files and external paths", () => {
    const download = {
      id: "dl-1",
      torrent: {
        files: [
          { name: "Movie.mkv", path: "Movie.mkv", length: 100 },
          { name: "Movie.en.srt", path: "Movie.en.srt", length: 1 },
        ],
      },
    } as never;

    const tracks = buildSubtitleTracks(download, ["Movie/Movie.fr.srt"]);
    expect(tracks.length).toBeGreaterThanOrEqual(2);
    expect(tracks[0].src).toContain("/streaming/dl-1/subtitles/");
    expect(tracks.some((t) => t.default)).toBe(true);
  });

  it("prefers blob URLs after successful prefetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => "1\n00:00:01,000 --> 00:00:02,000\nHi\n",
      }),
    );
    vi.stubGlobal(
      "URL",
      Object.assign(URL, {
        createObjectURL: vi.fn(() => "blob:track-1"),
      }),
    );

    const result = await resolveSubtitleTracksToBlobs([
      {
        kind: "subtitles",
        label: "English",
        srclang: "en",
        src: "/streaming/dl-1/subtitles/a.srt",
        default: true,
        format: "vtt",
      },
    ]);

    expect(result.tracks[0].src).toBe("blob:track-1");
    expect(result.blobUrls).toEqual(["blob:track-1"]);
    vi.unstubAllGlobals();
  });
});
