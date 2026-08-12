import { describe, expect, it } from "vitest";

import { formatSeasonEpisode } from "./episode.helper";
import { buildEpisodeDownloadMap, getEpisodesCoveredByDownload } from "./episode-downloads.helper";

describe("episode helpers", () => {
  it("formats season/episode labels", () => {
    expect(formatSeasonEpisode(1)).toBe("S01");
    expect(formatSeasonEpisode(2, 5)).toBe("S02E05");
  });

  it("maps downloads to covered episodes", () => {
    const downloads = [
      {
        id: "dl-1",
        torrent: {
          name: "Show.S01E02.mkv",
          files: [{ name: "Show.S01E03.mkv", path: "Show.S01E03.mkv", length: 1 }],
        },
      },
      {
        id: "dl-2",
        torrent: { name: "Other", files: [] },
      },
    ] as never[];

    const map = buildEpisodeDownloadMap(downloads);
    expect(map.get("1-2")?.id).toBe("dl-1");
    expect(map.get("1-3")?.id).toBe("dl-1");
    expect(getEpisodesCoveredByDownload("dl-1", map)).toEqual([
      { season: 1, episode: 2 },
      { season: 1, episode: 3 },
    ]);
  });
});
