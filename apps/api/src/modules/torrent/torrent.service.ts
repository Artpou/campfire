import type WebTorrent from "webtorrent";

import { BadRequestError, ServiceUnavailableError } from "@/errors/error";
import { AuthenticatedService } from "@/modules/auth/auth.service";
import { torrentClient } from "@/modules/download/webtorrent.client";
import type { IndexerType } from "@/modules/indexer-manager/indexer-manager.schema";
import { IndexerManagerService } from "@/modules/indexer-manager/indexer-manager.service";
import type { IndexerAdapter } from "./adapters/base.adapter";
import { JackettAdapter } from "./adapters/jackett.adapter";
import { ProwlarrAdapter } from "./adapters/prowlarr.adapter";
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
  private async getIndexerConfig() {
    const config = await new IndexerManagerService(this.user).get();
    if (!config) throw new BadRequestError("No indexer is configured");
    return config;
  }

  async getIndexers(): Promise<TorrentIndexerQuery[]> {
    const config = await this.getIndexerConfig();
    return ADAPTERS[config.indexerType].getIndexers({
      apiKey: config.indexerApiKey,
      baseUrl: config.indexerUrl,
    });
  }

  async searchTorrents(query: torrentSearchQuery): Promise<Torrent[]> {
    const config = await this.getIndexerConfig();
    const adapter = ADAPTERS[config.indexerType];
    const adapterConfig = { apiKey: config.indexerApiKey, baseUrl: config.indexerUrl };

    const { media, indexerId, season, episode } = query;

    const suffix = buildSeasonEpisodeSuffix(season, episode);
    const appendSuffix = (q: string) => (suffix ? `${q} ${suffix}` : q);

    const search = (query: string, categories: string[]) =>
      adapter.search({ q: query, t: media.type, indexerId, categories }, adapterConfig);

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
