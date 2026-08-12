import { describe, expect, it } from "vitest";

import { getDownloadStatus, getTorrentFiles, hasFiles } from "./downloads.helper";

describe("downloads.helper", () => {
  it("hasFiles checks torrent or remote location", () => {
    expect(hasFiles(undefined)).toBe(false);
    expect(hasFiles({ torrent: null, remoteLocation: null } as never)).toBe(false);
    expect(hasFiles({ torrent: { name: "x" }, remoteLocation: null } as never)).toBe(true);
    expect(hasFiles({ torrent: null, remoteLocation: "/remote" } as never)).toBe(true);
  });

  it("maps download status", () => {
    expect(getDownloadStatus({ error: "boom" })).toBe("failed");
    expect(getDownloadStatus({ torrent: null, remoteLocation: "/x" })).toBe("completed");
    expect(getDownloadStatus({ torrent: null })).toBe("queued");
    expect(getDownloadStatus({ torrent: { done: true } })).toBe("completed");
    expect(getDownloadStatus({ torrent: { done: false, paused: true } })).toBe("paused");
    expect(getDownloadStatus({ torrent: { done: false, paused: false } })).toBe("downloading");
  });

  it("narrows torrent files arrays", () => {
    expect(getTorrentFiles({ torrent: null } as never)).toEqual([]);
    expect(getTorrentFiles({ torrent: { files: "bad" } } as never)).toEqual([]);
    expect(
      getTorrentFiles({
        torrent: { files: [{ name: "a.mkv", path: "a.mkv", length: 1 }] },
      } as never),
    ).toHaveLength(1);
  });
});
