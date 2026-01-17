import type WebTorrent from "webtorrent";

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
    const indexerConfig = await new IndexerManagerService(this.user).getSelected();

    if (!indexerConfig) throw new Error(`No indexer is configured for this user`);
    if (!indexerConfig.apiKey) throw new Error(`No API key is configured for this indexer`);
    if (!indexerConfig.baseUrl) throw new Error(`No base URL is configured for this indexer`);

    return this.getAdapter(indexerConfig.name).getIndexers({
      apiKey: indexerConfig.apiKey,
      baseUrl: indexerConfig.baseUrl,
    });
  }

  async searchTorrents(media: Media, indexerId: string): Promise<Torrent[]> {
    const indexerConfig = await new IndexerManagerService(this.user).getSelected();

    if (!indexerConfig) throw new Error(`No indexer is configured for this user`);
    if (!indexerConfig.apiKey) throw new Error(`No API key is configured for this indexer`);
    if (!indexerConfig.baseUrl) throw new Error(`No base URL is configured for this indexer`);

    const config = { apiKey: indexerConfig.apiKey, baseUrl: indexerConfig.baseUrl };
    const categories = media.type === "movie" ? ["2000"] : ["5000"];

    const search = async (query: string) => {
      return await this.getAdapter(indexerConfig.name).search(
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
    console.log(sanitizedTitle, media.sanitize_title);
    const title = this.sanitizeQuery(media.title ?? "");

    const torrents = await search(this.sanitizeQuery(media.sanitize_title ?? ""));
    if (title !== sanitizedTitle) {
      torrents.push(...(await search(this.sanitizeQuery(media.title))));
    }

    // dedup
    return torrents.filter(
      (torrent, index, self) => index === self.findIndex((t) => t.guid === torrent.guid),
    );
  }

  async inspectTorrent(torrentUri: string): Promise<TorrentInspectResult> {
    const client = WebTorrentClient.getClient();

    return new Promise((resolve, reject) => {
      let torrent: WebTorrent.Torrent | null = null;

      const timeoutId = setTimeout(() => {
        if (torrent) torrent.destroy();
        reject(new Error("Torrent metadata fetch timeout (30s)"));
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
