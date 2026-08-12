import { describe, expect, it } from "vitest";

import {
  getBackdropUrl,
  getMediaType,
  getPosterUrl,
  getRemainingTime,
  getWatchProgressPercent,
  hasActiveDownload,
  hasWatchProgress,
  isActiveDownload,
  isMediaWatched,
} from "./media.helper";

describe("media.helper", () => {
  it("builds poster and backdrop URLs", () => {
    expect(getPosterUrl(null)).toBe("");
    expect(getPosterUrl("/abc.jpg", "w500")).toBe("https://image.tmdb.org/t/p/w500/abc.jpg");
    expect(getPosterUrl("https://cdn/x.jpg")).toBe("https://cdn/x.jpg");
    expect(getBackdropUrl(undefined)).toBeUndefined();
    expect(getBackdropUrl("/bg.jpg", "w780")).toBe("https://image.tmdb.org/t/p/w780/bg.jpg");
  });

  it("normalizes media types", () => {
    expect(getMediaType("movie")).toBe("movie");
    expect(getMediaType("tv")).toBe("tv");
    expect(getMediaType("other")).toBeUndefined();
    expect(getMediaType(1)).toBeUndefined();
  });

  it("computes watch progress helpers", () => {
    expect(getWatchProgressPercent({ progress: null } as never)).toBe(0);
    expect(getWatchProgressPercent({ progress: { position: 50, duration: 100 } } as never)).toBe(50);
    expect(hasWatchProgress({ progress: { position: 10, duration: 100 } } as never)).toBe(true);
    expect(hasWatchProgress({ progress: { position: 96, duration: 100 } } as never)).toBe(false);
    expect(isMediaWatched({ progress: { position: 10, duration: 100, completed: true } })).toBe(true);
    expect(isMediaWatched({ progress: { position: 95, duration: 100 } })).toBe(true);
    expect(isMediaWatched({ progress: { position: 10, duration: 100 } })).toBe(false);
    expect(isMediaWatched({})).toBe(false);
  });

  it("formats remaining time", () => {
    expect(getRemainingTime({ progress: { position: 0, duration: 0 } } as never)).toBeNull();
    expect(getRemainingTime({ progress: { position: 0, duration: 125 } } as never)).toMatch(/3 minutes/);
    expect(getRemainingTime({ progress: { position: 0, duration: 3700 } } as never)).toMatch(/1h/);
    expect(getRemainingTime({ duration: 90 } as never)).toMatch(/1h30/);
  });

  it("detects active downloads", () => {
    expect(isActiveDownload(undefined)).toBe(false);
    expect(isActiveDownload({ torrent: { transferring: true } } as never)).toBe(true);
    expect(isActiveDownload({ torrent: { done: false, paused: false } } as never)).toBe(true);
    expect(isActiveDownload({ torrent: { done: true, paused: false } } as never)).toBe(false);
    expect(
      hasActiveDownload({
        pages: [{ results: [{ download: { torrent: { done: false, paused: false } } }] }],
        pageParams: [],
      } as never),
    ).toBe(true);
  });
});
