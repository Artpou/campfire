import { IndexerType } from "../../../db/schema";

export type TorrentQuality = "SD" | "HD" | "2K" | "4K" | undefined;

export interface TorrentIndexer {
  id: string;
  name: IndexerType;
  privacy: "private" | "semi-private" | "public";
}

export interface Torrent {
  title: string;
  tracker: string;
  size: number;
  publishDate: string;
  seeders: number;
  peers: number;
  link: string;
  guid: string;
  quality: TorrentQuality;
  language?: string;
  detailsUrl?: string;
  indexerType: IndexerType;
}

export interface IndexerAdapter {
  getIndexers(apiKey: string): Promise<TorrentIndexer[]>;
  search(
    query: { q: string; t: string; indexerId?: string; categories?: string[] },
    apiKey: string,
  ): Promise<Torrent[]>;
}
