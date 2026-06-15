import type WebTorrent from "webtorrent";

import { BadRequestError, ServiceUnavailableError } from "@/errors/error";
import { AuthenticatedService } from "@/modules/auth/auth.service";
import { torrentClient } from "@/modules/download/webtorrent.client";
import { TORRENTIO_BASE_URL } from "@/modules/indexer-manager/indexer-manager.dto";
import type { IndexerType } from "@/modules/indexer-manager/indexer-manager.schema";
import { IndexerManagerService } from "@/modules/indexer-manager/indexer-manager.service";
import type { IndexerAdapter } from "./adapters/base.adapter";
import { JackettAdapter } from "./adapters/jackett.adapter";
import { ProwlarrAdapter } from "./adapters/prowlarr.adapter";
import { TorrentioAdapter } from "./adapters/torrentio.adapter";
import type {
  Torrent,
  TorrentIndexerQuery,
  TorrentInspectResult,
  torrentInspectQuery,
  torrentSearchQuery,
} from "./torrent.dto";

const ADAPTERS: Record<IndexerType, IndexerAdapter> = {
  jackett: new JackettAdapter(),
  prowlarr: new ProwlarrAdapter(),
  torrentio: new TorrentioAdapter(),
};

function sanitizeQuery(query: string): string {
  return query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[._\-:]/g, "+")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSeasonEpisodeSuffix(season?: number, episode?: number): string {
  if (!season) return "";
  const s = `S${season.toString().padStart(2, "0")}`;
  if (!episode) return s;
  return `${s}E${episode.toString().padStart(2, "0")}`;
}

export class TorrentService extends AuthenticatedService {
  private getManagerService(): IndexerManagerService {
    return new IndexerManagerService(this.user);
  }

  async getIndexers(): Promise<TorrentIndexerQuery[]> {
    const managers = await this.getManagerService().getMany();
    const activeManagers = managers.filter((m) => !m.disabled);
    if (activeManagers.length === 0) throw new BadRequestError("No indexer is configured");

    const results: TorrentIndexerQuery[] = [];
    for (const manager of activeManagers) {
      for (const idx of manager.indexers) {
        results.push({
          id: idx.id,
          name: idx.name,
          label: idx.label,
          lang: idx.lang ?? undefined,
          privacy: idx.privacy as "private" | "semi-private" | "public",
          description: idx.description ?? undefined,
          indexerManagerId: manager.id,
          indexerManagerType: manager.indexerType,
        });
      }
    }
    return results;
  }

  async searchTorrents(query: torrentSearchQuery): Promise<Torrent[]> {
    const manager = await this.getManagerService().get(query.indexerManagerId);
    if (!manager) throw new BadRequestError("Indexer manager not found");
    if (manager.disabled) throw new BadRequestError("Indexer manager is disabled");

    const adapter = ADAPTERS[manager.indexerType];
    const { media, indexerId, season, episode, imdbId } = query;

    if (manager.indexerType === "torrentio") {
      const providers = manager.indexers.map((i) => i.name);
      const adapterConfig = {
        apiKey: "",
        baseUrl: manager.indexerUrl ?? TORRENTIO_BASE_URL,
        providers,
      };
      return adapter.search({ q: "", t: media.type, imdbId, season, episode }, adapterConfig);
    }

    const adapterConfig = {
      apiKey: manager.indexerApiKey ?? "",
      baseUrl: manager.indexerUrl ?? "",
    };

    const suffix = buildSeasonEpisodeSuffix(season, episode);
    const appendSuffix = (q: string) => (suffix ? `${q} ${suffix}` : q);

    const search = (q: string, categories: string[]) =>
      adapter.search({ q, t: media.type, indexerId, categories, imdbId }, adapterConfig);

    let categories =
      media.type === "movie"
        ? ["2010", "2020", "2030", "2040", "2050", "2060", "2070", "2080", "2090"]
        : ["5010", "5020", "5030", "5040", "5050", "5060", "5070", "5080", "5090"];

    const sanitizedTitle = sanitizeQuery(media.sanitize_title ?? "");
    const title = sanitizeQuery(media.title ?? "");

    const torrents = await search(appendSuffix(sanitizedTitle), categories);
    if (title !== sanitizedTitle) {
      torrents.push(...(await search(appendSuffix(title), categories)));
    }

    if (torrents.length === 0) {
      categories = media.type === "movie" ? ["2000"] : ["5000"];
      torrents.push(...(await search(appendSuffix(sanitizedTitle), categories)));
      if (title !== sanitizedTitle) {
        torrents.push(...(await search(appendSuffix(title), categories)));
      }
    }

    return torrents.filter((t, i, self) => i === self.findIndex((x) => x.guid === t.guid));
  }

  async inspectTorrent(query: torrentInspectQuery): Promise<TorrentInspectResult> {
    const { magnet } = query;
    const client = torrentClient.getClient();

    return new Promise((resolve, reject) => {
      let torrent: WebTorrent.Torrent | null = null;

      const timeoutId = setTimeout(() => {
        if (torrent) torrent.destroy();
        reject(new ServiceUnavailableError("Torrent metadata fetch"));
      }, 30000);

      torrent = client.add(magnet, { path: "/tmp" });

      torrent.on("metadata", () => {
        if (!torrent) return;
        clearTimeout(timeoutId);

        for (const file of torrent.files) file.deselect();

        const result: TorrentInspectResult = {
          name: torrent.name,
          infoHash: torrent.infoHash,
          files: torrent.files.map((file) => ({
            name: file.name,
            path: file.path,
            length: file.length,
          })),
          totalSize: torrent.length,
        };

        torrent.destroy();
        resolve(result);
      });

      (torrent as unknown as { on: (event: string, callback: (err: Error) => void) => void }).on(
        "error",
        (err: Error) => {
          clearTimeout(timeoutId);
          if (torrent) torrent.destroy();
          reject(err);
        },
      );
    });
  }
}
