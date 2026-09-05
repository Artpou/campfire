import { NotFoundError } from "@/shared/errors/error";

import type { IndexerAdapter } from "@/modules/torrent/adapters/indexer.adapter";
import { JackettAdapter } from "@/modules/torrent/adapters/jackett.adapter";
import { ProwlarrAdapter } from "@/modules/torrent/adapters/prowlarr.adapter";
import { StremioAdapter } from "@/modules/torrent/adapters/stremio.adapter";
import { moduleRepository } from "../module.repository";
import { moduleToIndexer } from "./module-indexer.bridge";
import type { IndexerModule } from "./module-indexer.types";

/** Build a torrent adapter from an indexer module (no HTTP service coupling). */
export function createIndexerAdapter(indexer: IndexerModule): IndexerAdapter {
  if (indexer.indexerType === "prowlarr") return new ProwlarrAdapter(indexer);
  if (indexer.indexerType === "jackett") return new JackettAdapter(indexer);
  return new StremioAdapter(indexer);
}

/** Load one indexer module without probing external indexer lists. */
export async function loadIndexerModule(id: string): Promise<IndexerModule> {
  const row = await moduleRepository.find(id);
  if (!row || row.category !== "indexer") throw new NotFoundError("Indexer module not found");
  return moduleToIndexer(row);
}
