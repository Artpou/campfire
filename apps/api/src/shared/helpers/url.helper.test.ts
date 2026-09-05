import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  assertPublicHttpUrl,
  assertSafeIndexerUrl,
  assertSafeTorrentFetchUrl,
  fetchFollowingRedirects,
  isPrivateHost,
  redactUrl,
} from "./url.helper";

vi.mock("node:dns/promises", () => ({
  default: {
    lookup: vi.fn(),
  },
}));

const dns = (await import("node:dns/promises")).default;

describe("isPrivateHost", () => {
  it("detects common private hosts", () => {
    expect(isPrivateHost("localhost")).toBe(true);
    expect(isPrivateHost("127.0.0.1")).toBe(true);
    expect(isPrivateHost("192.168.1.1")).toBe(true);
    expect(isPrivateHost("169.254.169.254")).toBe(true);
    expect(isPrivateHost("metadata.google.internal")).toBe(true);
  });

  it("allows public hosts", () => {
    expect(isPrivateHost("example.com")).toBe(false);
  });
});

describe("redactUrl", () => {
  it("redacts apikey query params", () => {
    expect(redactUrl("http://localhost:9696/dl?apikey=secret&link=abc")).toBe(
      "http://localhost:9696/dl?apikey=***&link=abc",
    );
  });
});

describe("assertPublicHttpUrl", () => {
  beforeEach(() => {
    vi.mocked(dns.lookup).mockReset();
  });

  it("accepts public http(s) URLs", async () => {
    vi.mocked(dns.lookup).mockResolvedValue({ address: "93.184.216.34", family: 4 });
    await expect(assertPublicHttpUrl("https://example.com/file.torrent")).resolves.toBeUndefined();
  });

  it("rejects private network URLs", async () => {
    await expect(assertPublicHttpUrl("http://127.0.0.1/file.torrent")).rejects.toThrow(/private networks/);
  });
});

describe("assertSafeTorrentFetchUrl", () => {
  beforeEach(() => {
    vi.mocked(dns.lookup).mockReset();
  });

  it("allows local Prowlarr/Jackett URLs", async () => {
    vi.mocked(dns.lookup).mockResolvedValue({ address: "192.168.1.10", family: 4 });
    await expect(assertSafeTorrentFetchUrl("http://192.168.1.10:9696/download")).resolves.toBeUndefined();
  });

  it("rejects cloud metadata endpoints", async () => {
    await expect(assertSafeTorrentFetchUrl("http://169.254.169.254/latest")).rejects.toThrow(/cloud metadata/);
  });

  it("rejects DNS rebinding to private IP from public hostname", async () => {
    vi.mocked(dns.lookup).mockResolvedValue({ address: "10.0.0.5", family: 4 });
    await expect(assertSafeTorrentFetchUrl("https://evil.example/file.torrent")).rejects.toThrow(/private network/);
  });
});

describe("assertSafeIndexerUrl", () => {
  beforeEach(() => {
    vi.mocked(dns.lookup).mockReset();
  });

  it("allows private network indexer URLs", async () => {
    vi.mocked(dns.lookup).mockResolvedValue({ address: "192.168.1.1", family: 4 });
    await expect(assertSafeIndexerUrl("http://192.168.1.1:9117")).resolves.toBeUndefined();
  });

  it("rejects cloud metadata endpoints", async () => {
    await expect(assertSafeIndexerUrl("http://169.254.169.254")).rejects.toThrow();
  });

  it("rejects DNS rebinding from public hostname to private IP", async () => {
    vi.mocked(dns.lookup).mockResolvedValue({ address: "192.168.0.1", family: 4 });
    await expect(assertSafeIndexerUrl("http://jackett.example.com")).rejects.toThrow(/private network/);
  });
});

describe("fetchFollowingRedirects", () => {
  beforeEach(() => {
    vi.mocked(dns.lookup).mockReset();
    vi.unstubAllGlobals();
  });

  it("re-validates each redirect hop", async () => {
    vi.mocked(dns.lookup).mockResolvedValue({ address: "93.184.216.34", family: 4 });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        status: 302,
        headers: { get: (name: string) => (name === "location" ? "https://cdn.example.com/manifest.json" : null) },
        ok: false,
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: { get: () => null },
      });
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchFollowingRedirects("https://example.com/manifest.json", assertPublicHttpUrl);
    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: "manual" });
  });

  it("rejects redirect to private network", async () => {
    vi.mocked(dns.lookup).mockImplementation(async (hostname: string) => {
      if (hostname === "evil.example") return { address: "93.184.216.34", family: 4 };
      return { address: "127.0.0.1", family: 4 };
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 302,
        headers: { get: (name: string) => (name === "location" ? "http://127.0.0.1/secret" : null) },
        ok: false,
      }),
    );

    await expect(fetchFollowingRedirects("https://evil.example/m", assertPublicHttpUrl)).rejects.toThrow(
      /private networks/,
    );
  });
});
