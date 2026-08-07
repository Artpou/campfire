import type { TorrentInspectQuery, TorrentListQuery } from "@seedarr/contracts";
import { formatError } from "@seedarr/shared";
import type WebTorrent from "webtorrent";

import { BadRequestError, NotFoundError, ServiceUnavailableError } from "@/shared/errors/error";
import { AuthenticatedService } from "@/shared/services/authenticated.service";

import { torrentClient } from "@/modules/download/webtorrent/webtorrent-manager";
import { IndexerManagerService } from "@/modules/indexer-manager/indexer-manager.service";
import type { User } from "@/modules/user/user.schema";
import type { Torrent, TorrentInspectResult } from "./torrent.types";
import { probeTorrentPeers } from "./torrent-peer.helper";
import { resolveTorrentSource } from "./torrent-source.helper";

const METADATA_TIMEOUT_MS = 30_000;

export class TorrentService extends AuthenticatedService {
  private readonly managerService: IndexerManagerService;

  constructor(user: User) {
    super(user);
    this.managerService = new IndexerManagerService(user);
  }

  async list(query: TorrentListQuery): Promise<Torrent[]> {
    const manager = await this.managerService.get(query.indexerManagerId);
    if (!manager) throw new NotFoundError("Indexer manager not found");
    if (manager.disabled) throw new BadRequestError("Indexer manager is disabled");

    const adapter = this.managerService.getAdapter(manager);
    return await adapter.getTorrents(query);
  }

  async inspectTorrent(query: TorrentInspectQuery): Promise<TorrentInspectResult> {
    const source = await resolveTorrentSource(query.magnet);
    const client = torrentClient.getClient();

    return new Promise((resolve, reject) => {
      let torrent: WebTorrent.Torrent | null = null;
      let settled = false;

      const timeoutId = setTimeout(() => {
        if (torrent) torrent.destroy();
        reject(new ServiceUnavailableError("Torrent metadata fetch"));
      }, METADATA_TIMEOUT_MS);

      const finish = async (activeTorrent: WebTorrent.Torrent) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);

        for (const file of activeTorrent.files) file.deselect();

        const peersFound = await probeTorrentPeers(activeTorrent);

        const result: TorrentInspectResult = {
          name: activeTorrent.name,
          infoHash: activeTorrent.infoHash,
          files: activeTorrent.files.map((file) => ({
            name: file.name,
            path: file.path,
            length: file.length,
          })),
          totalSize: activeTorrent.length,
          trackers: activeTorrent.announce ?? [],
          peersFound,
          indexerSeeders: query.indexerSeeders,
        };

        activeTorrent.destroy();
        resolve(result);
      };

      torrent = client.add(source, { path: "/tmp" });

      torrent.on("metadata", () => {
        if (!torrent) return;
        finish(torrent).catch((err) => {
          torrent?.destroy();
          reject(err);
        });
      });

      torrent.on("error", (err) => {
        clearTimeout(timeoutId);
        if (torrent) torrent.destroy();
        const message = formatError(err);
        reject(new ServiceUnavailableError(`Torrent error: ${message}`));
      });

      if (torrent.ready) {
        finish(torrent).catch((err) => {
          torrent?.destroy();
          reject(err);
        });
      }
    });
  }
}
