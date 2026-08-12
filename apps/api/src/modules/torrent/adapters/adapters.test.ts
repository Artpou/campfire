import { afterEach, describe, expect, it, vi } from "vitest";

import type { IndexerManager } from "@/modules/indexer-manager/indexer-manager.schema";
import { JackettAdapter } from "./jackett.adapter";
import { ProwlarrAdapter } from "./prowlarr.adapter";
import { StremioAdapter } from "./stremio.adapter";

function manager(partial: Partial<IndexerManager> & Pick<IndexerManager, "indexerType">): IndexerManager {
  return {
    id: "idx-1",
    indexerUrl: "http://indexer.local",
    indexerApiKey: "secret-key",
    disabled: false,
    manifest: null,
    ...partial,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("IndexerAdapter constructors", () => {
  it("rejects missing / disabled / wrong type managers", () => {
    expect(() => new JackettAdapter(undefined as unknown as IndexerManager)).toThrow();
    expect(() => new JackettAdapter(manager({ indexerType: "jackett", disabled: true }))).toThrow(/disabled/);
    expect(() => new JackettAdapter(manager({ indexerType: "prowlarr" }))).toThrow(/valid indexer/);
  });
});

describe("JackettAdapter", () => {
  it("lists configured indexers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ ID: "rarbg", Name: "RARBG", Type: "public", Language: "en-US" }],
      }),
    );

    const adapter = new JackettAdapter(manager({ indexerType: "jackett" }));
    const indexers = await adapter.getIndexers();
    expect(indexers).toEqual([expect.objectContaining({ id: "rarbg", label: "RARBG", privacy: "public", lang: "en" })]);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("apikey=secret-key"), undefined);
  });

  it("maps torrent search results and dedupes by Guid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          Results: [
            {
              Title: "Dune.2021.1080p.BluRay",
              Tracker: "RARBG",
              Size: 1e9,
              PublishDate: "2021-01-01",
              Seeders: 10,
              Peers: 2,
              Link: "http://dl/1",
              Guid: "g1",
              Details: "http://details/1",
              MagnetUri: "magnet:?xt=urn:btih:abc",
            },
            {
              Title: "Dune duplicate",
              Tracker: "RARBG",
              Size: 1,
              PublishDate: "2021-01-01",
              Seeders: 1,
              Peers: 0,
              Link: "http://dl/2",
              Guid: "g1",
              Details: "http://details/2",
            },
          ],
        }),
      }),
    );

    const adapter = new JackettAdapter(manager({ indexerType: "jackett" }));
    const torrents = await adapter.getTorrents({
      indexerManagerId: "idx-1",
      media: { id: 1, type: "movie", title: "Dune", imdbId: "tt1160419" },
    });

    expect(torrents).toHaveLength(1);
    expect(torrents[0]).toMatchObject({
      title: "Dune.2021.1080p.BluRay",
      tracker: "RARBG",
      guid: "g1",
      indexerType: "jackett",
      magnetUrl: "magnet:?xt=urn:btih:abc",
    });
  });

  it("requires an API key", async () => {
    const adapter = new JackettAdapter(manager({ indexerType: "jackett", indexerApiKey: null }));
    await expect(adapter.getIndexers()).rejects.toThrow(/API key/);
  });
});

describe("ProwlarrAdapter", () => {
  it("lists enabled indexers only", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: 1,
            name: "Enabled",
            definitionName: "enabled",
            description: "ok",
            language: "fr-FR",
            privacy: "private",
            enable: true,
          },
          {
            id: 2,
            name: "Disabled",
            definitionName: "disabled",
            description: "",
            language: "en",
            privacy: "public",
            enable: false,
          },
        ],
      }),
    );

    const adapter = new ProwlarrAdapter(manager({ indexerType: "prowlarr" }));
    const indexers = await adapter.getIndexers();
    expect(indexers).toHaveLength(1);
    expect(indexers[0]).toMatchObject({ id: "1", label: "Enabled", lang: "fr", privacy: "private" });
  });

  it("maps search results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            quality: "1080p",
            guid: "guid-1",
            size: 500,
            indexer: "NZB",
            title: "Show.S01E01.1080p",
            publishDate: "2024-01-01",
            downloadUrl: "http://dl",
            infoHash: "hash1",
            infoUrl: "http://info",
            seeders: 5,
            leechers: 1,
          },
        ],
      }),
    );

    const adapter = new ProwlarrAdapter(manager({ indexerType: "prowlarr" }));
    const torrents = await adapter.getTorrents({
      indexerManagerId: "idx-1",
      media: { id: 2, type: "tv", title: "Show", imdbId: "tt0000002" },
      season: 1,
      episode: 1,
    });

    expect(torrents[0]).toMatchObject({
      title: "Show.S01E01.1080p",
      tracker: "NZB",
      indexerType: "prowlarr",
      seeders: 5,
      peers: 1,
      link: "http://dl",
    });
  });
});

describe("StremioAdapter", () => {
  it("returns empty indexers list", async () => {
    const adapter = new StremioAdapter(manager({ indexerType: "stremio", indexerApiKey: null }));
    await expect(adapter.getIndexers()).resolves.toEqual([]);
  });

  it("maps movie streams to magnet torrents", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          streams: [
            {
              name: "Torrentio",
              title: "Dune\n👤 12 💾 2.5 GB ⚙️ Torrentio",
              infoHash: "ABCDEF",
              fileIdx: 0,
              behaviorHints: { filename: "Dune.2021.mkv" },
            },
          ],
          cacheMaxAge: 0,
          staleRevalidate: "",
          staleError: "",
        }),
      }),
    );

    const adapter = new StremioAdapter(manager({ indexerType: "stremio", indexerApiKey: null }));
    const torrents = await adapter.getTorrents({
      indexerManagerId: "idx-1",
      media: { id: 1, type: "movie", title: "Dune", imdbId: "tt1160419" },
    });

    expect(torrents).toHaveLength(1);
    expect(torrents[0]).toMatchObject({
      title: "Dune.2021.mkv",
      seeders: 12,
      size: 2.5e9,
      tracker: "Torrentio",
      indexerType: "stremio",
      magnetUrl: "magnet:?xt=urn:btih:ABCDEF",
    });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("stream/movie/tt1160419.json"), undefined);
  });

  it("uses season/episode for TV streams", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ streams: [], cacheMaxAge: 0, staleRevalidate: "", staleError: "" }),
      }),
    );

    const adapter = new StremioAdapter(manager({ indexerType: "stremio", indexerApiKey: null }));
    await adapter.getTorrents({
      indexerManagerId: "idx-1",
      media: { id: 2, type: "tv", title: "Show", imdbId: "tt999" },
      season: 2,
      episode: 5,
    });

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("stream/series/tt999:2:5.json"), undefined);
  });
});
