import { describe, expect, it } from "vitest";

import { enrichMagnetUri, magnetHasTrackers } from "./magnet-tracker.helper";

describe("magnetHasTrackers", () => {
  it("detects tr= in bare and enriched magnets", () => {
    expect(magnetHasTrackers("magnet:?xt=urn:btih:abc")).toBe(false);
    expect(magnetHasTrackers("magnet:?xt=urn:btih:abc&tr=udp://tracker.example:6969/announce")).toBe(true);
  });
});

describe("enrichMagnetUri", () => {
  it("appends public trackers to Torrentio-style bare magnets", () => {
    const bare = "magnet:?xt=urn:btih:98cbfaa598beffe5c00ed6d56655c6b2f608b92e";
    const enriched = enrichMagnetUri(bare, ["udp://tracker.example:6969/announce"]);

    expect(enriched).toContain("xt=urn:btih:98cbfaa598beffe5c00ed6d56655c6b2f608b92e");
    expect(enriched).toContain("tr=udp%3A%2F%2Ftracker.example%3A6969%2Fannounce");
  });

  it("does not duplicate trackers when magnet already has them", () => {
    const withTrackers = "magnet:?xt=urn:btih:abc&tr=udp://existing:6969/announce";
    expect(enrichMagnetUri(withTrackers)).toBe(withTrackers);
  });

  it("returns non-magnet URIs unchanged", () => {
    const http = "https://example.com/file.torrent";
    expect(enrichMagnetUri(http)).toBe(http);
  });
});
