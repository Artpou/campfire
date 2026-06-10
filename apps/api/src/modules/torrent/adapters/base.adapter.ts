import type { Torrent, TorrentIndexerQuery } from "@/modules/torrent/torrent.dto";

export interface IndexerConfig {
  apiKey: string;
  baseUrl: string;
}

export interface IndexerAdapter {
  getIndexers(config: IndexerConfig): Promise<TorrentIndexerQuery[]>;
  search(
    query: { q: string; t: string; indexerId?: string; categories?: string[] },
    config: IndexerConfig,
  ): Promise<Torrent[]>;
}
