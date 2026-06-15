import type { Torrent, TorrentIndexerQuery } from "@/modules/torrent/torrent.dto";

export interface IndexerConfig {
  apiKey: string;
  baseUrl: string;
  providers?: string[];
}

export interface SearchQuery {
  q: string;
  t: string;
  indexerId?: string;
  categories?: string[];
  imdbId?: string;
  season?: number;
  episode?: number;
}

export interface IndexerAdapter {
  getIndexers(config: IndexerConfig): Promise<TorrentIndexerQuery[]>;
  search(query: SearchQuery, config: IndexerConfig): Promise<Torrent[]>;
}
