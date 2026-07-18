import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveTorrentSource } from "@/modules/torrent/torrent-source.helper";

vi.mock("node:dns/promises", () => ({
  default: {
    lookup: vi.fn().mockResolvedValue({ address: "93.184.216.34", family: 4 }),
  },
}));

describe("resolveTorrentSource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns enriched magnets for bare magnets", async () => {
    const magnet = "magnet:?xt=urn:btih:abc";
    const result = await resolveTorrentSource(magnet);
    expect(result).toContain("xt=urn:btih:abc");
    expect(result).toContain("tr=");
  });

  it("rejects private http URLs", async () => {
    await expect(resolveTorrentSource("http://127.0.0.1/file.torrent")).rejects.toThrow(/private networks/);
  });

  it("rejects redirects to private networks", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: { Location: "http://192.168.1.1/file.torrent" },
        }),
      ),
    );

    await expect(resolveTorrentSource("https://example.com/file.torrent")).rejects.toThrow(/private networks/);
  });

  it("follows redirects to public URLs", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { Location: "https://cdn.example.com/file.torrent" },
        }),
      )
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveTorrentSource("https://example.com/redirect.torrent");
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
