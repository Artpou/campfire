import type WebTorrent from "webtorrent";

import { BadRequestError, NotFoundError, ServiceUnavailableError } from "@/errors/error";
import { AuthenticatedService } from "@/modules/auth/auth.service";
import { torrentClient } from "@/modules/download/webtorrent.client";
import { IndexerManagerService } from "@/modules/indexer-manager/indexer-manager.service";
import { User } from "@/types";
import type { EventEmitter } from "node:events";
import type { Torrent, TorrentInspectResult, torrentInspectQuery, torrentListQuery } from "./torrent.dto";

export class TorrentService extends AuthenticatedService {
  private readonly managerService: IndexerManagerService;

  constructor(user: User) {
    super(user);
    this.managerService = new IndexerManagerService(user);
  }

  async list(query: torrentListQuery): Promise<Torrent[]> {
    const manager = await this.managerService.get(query.indexerManagerId);
    if (!manager) throw new NotFoundError("Indexer manager not found");
    if (manager.disabled) throw new BadRequestError("Indexer manager is disabled");

    const adapter = this.managerService.getAdapter(manager);
    return adapter.getTorrents(query);
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

      (torrent as unknown as EventEmitter).on("error", (err: Error) => {
        clearTimeout(timeoutId);
        if (torrent) torrent.destroy();
        reject(new ServiceUnavailableError(`Torrent error: ${err.message}`));
      });
    });
  }
}
