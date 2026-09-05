import type { TorrentInspectQuery, TorrentListQuery } from "@seedarr/contracts";
import { formatError } from "@seedarr/shared";
import type WebTorrent from "webtorrent";

import { BadRequestError, NotFoundError, ServiceUnavailableError } from "@/shared/errors/error";
import { logger } from "@/shared/helpers/logger.helper";
import { AuthenticatedService } from "@/shared/services/authenticated.service";

import { torrentClient } from "@/modules/download/webtorrent/webtorrent-manager";
import { createIndexerAdapter, loadIndexerModule } from "@/modules/module/indexer/module-indexer.adapter";
import type { Torrent, TorrentInspectResult } from "./torrent.types";
import { probeTorrentPeers } from "./torrent-peer.helper";
import { resolveTorrentSource } from "./torrent-source.helper";

const METADATA_TIMEOUT_MS = 30_000;
const MAX_CONCURRENT_INSPECT = 3;
let inspectInFlight = 0;

export class TorrentService extends AuthenticatedService {
  async list(query: TorrentListQuery): Promise<Torrent[]> {
    const manager = await loadIndexerModule(query.moduleId);
    if (manager.disabled) throw new BadRequestError("Indexer manager is disabled");

    const adapter = createIndexerAdapter(manager);
    logger.debug("TORRENT", `Search media ${query.media.id} via ${manager.indexerType} (${query.moduleId})`);
    return await adapter.getTorrents(query);
  }

  async inspectTorrent(query: TorrentInspectQuery): Promise<TorrentInspectResult> {
    if (inspectInFlight >= MAX_CONCURRENT_INSPECT) {
      throw new ServiceUnavailableError("Too many torrent inspections in progress");
    }
    inspectInFlight += 1;
    logger.debug("TORRENT", "Inspect torrent metadata");

    try {
      const source = await resolveTorrentSource(query.magnet);
      const client = torrentClient.getClient();

      return await new Promise((resolve, reject) => {
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

        try {
          torrent = client.add(source, { path: "/tmp" });
          if (torrent.ready) {
            void finish(torrent);
          } else {
            torrent.once("ready", () => {
              void finish(torrent as WebTorrent.Torrent);
            });
            torrent.once("error", (err) => {
              if (settled) return;
              settled = true;
              clearTimeout(timeoutId);
              reject(err instanceof Error ? err : new Error(formatError(err)));
            });
          }
        } catch (err) {
          clearTimeout(timeoutId);
          reject(err instanceof Error ? err : new Error(formatError(err)));
        }
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ServiceUnavailableError) throw error;
      throw new BadRequestError(`Failed to inspect torrent: ${formatError(error)}`);
    } finally {
      inspectInFlight -= 1;
    }
  }
}
