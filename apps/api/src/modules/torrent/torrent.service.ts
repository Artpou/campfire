import type WebTorrent from "webtorrent";

import { BadRequestError, ServiceUnavailableError } from "@/errors/error";
import { WebTorrentClient } from "@/modules/download/webtorrent.client";
import { IndexerManagerService } from "@/modules/indexer-manager/indexer-manager.service";
import { AuthenticatedService } from "../../classes/authenticated-service";
import { type IndexerType } from "../../db/schema";
import type { Media } from "../media/media.dto";
import type { IndexerAdapter } from "./adapters/base.adapter";
import { JackettAdapter } from "./adapters/jackett.adapter";
import { ProwlarrAdapter } from "./adapters/prowlarr.adapter";
import type { Torrent, TorrentIndexer, TorrentInspectResult } from "./torrent.dto";

export class TorrentService extends AuthenticatedService {
  private readonly adapters: Record<IndexerType, IndexerAdapter> = {
    jackett: new JackettAdapter(),
    prowlarr: new ProwlarrAdapter(),
  };

  private getAdapter(indexer: IndexerType): IndexerAdapter {
    return this.adapters[indexer];
  }

  private sanitizeQuery(query: string): string {
    return query
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[._\-:]/g, "+")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  async getIndexers(): Promise<TorrentIndexer[]> {
    const indexerConfig = await new IndexerManagerService(this.user).get();

    if (!indexerConfig) throw new BadRequestError("No indexer is configured");

    return this.getAdapter(indexerConfig.indexerType).getIndexers({
      apiKey: indexerConfig.indexerApiKey,
      baseUrl: indexerConfig.indexerUrl,
    });
  }

  async searchTorrents(
    media: Media,
    indexerId: string,
    options: { season?: number; episode?: number } = {},
  ): Promise<Torrent[]> {
    const indexerConfig = await new IndexerManagerService(this.user).get();

    if (!indexerConfig) throw new BadRequestError("No indexer is configured");

    const config = { apiKey: indexerConfig.indexerApiKey, baseUrl: indexerConfig.indexerUrl };
    let categories =
      media.type === "movie"
        ? ["2010", "2020", "2030", "2040", "2050", "2060", "2070", "2080", "2090"]
        : ["5010", "5020", "5030", "5040", "5050", "5060", "5070", "5080", "5090"];

    const seasonEpisodeSuffix = this.buildSeasonEpisodeSuffix(options.season, options.episode);
    const appendSuffix = (q: string) => (seasonEpisodeSuffix ? `${q} ${seasonEpisodeSuffix}` : q);

    const search = async (query: string, categories: string[]) => {
      return await this.getAdapter(indexerConfig.indexerType).search(
        {
          q: query,
          t: media.type,
          indexerId,
          categories,
        },
        config,
      );
    };

    const sanitizedTitle = this.sanitizeQuery(media.sanitize_title ?? "");
    const title = this.sanitizeQuery(media.title ?? "");

    const torrents = await search(appendSuffix(sanitizedTitle), categories);
    if (title !== sanitizedTitle) {
      torrents.push(...(await search(appendSuffix(title), categories)));
    }

    // If no torrents found, try default categories
    if (torrents.length === 0) {
      categories = media.type === "movie" ? ["2000"] : ["5000"];

      torrents.push(...(await search(appendSuffix(sanitizedTitle), categories)));
      if (title !== sanitizedTitle) {
        torrents.push(...(await search(appendSuffix(title), categories)));
      }
    }

    // dedup
    return torrents.filter(
      (torrent, index, self) => index === self.findIndex((t) => t.guid === torrent.guid),
    );
  }

  private buildSeasonEpisodeSuffix(season?: number, episode?: number): string {
    if (!season) return "";
    const s = `S${season.toString().padStart(2, "0")}`;
    if (!episode) return s;
    return `${s}E${episode.toString().padStart(2, "0")}`;
  }

  async inspectTorrent(torrentUri: string): Promise<TorrentInspectResult> {
    const client = WebTorrentClient.getClient();

    return new Promise((resolve, reject) => {
      let torrent: WebTorrent.Torrent | null = null;

      const timeoutId = setTimeout(() => {
        if (torrent) torrent.destroy();
        reject(new ServiceUnavailableError("Torrent metadata fetch"));
      }, 30000);

      // WebTorrent supports both magnet URIs and HTTP URLs to .torrent files
      torrent = client.add(torrentUri, {
        path: "/tmp",
      });

      torrent.on("metadata", () => {
        if (!torrent) return;
        clearTimeout(timeoutId);

        // Deselect all files to prevent downloading
        for (const file of torrent.files) {
          file.deselect();
        }

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
