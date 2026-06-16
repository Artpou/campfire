import { BadRequestError } from "@/errors/error";
import { sanitize } from "@/helpers/string.helper";
import { getLanguageFromTitle, getTorrentQuality } from "@/helpers/video.helper";
import { Indexer, IndexerManager, IndexerType } from "@/types";
import type { Torrent, torrentListQuery } from "../torrent.dto";
import { IndexerAdapter } from "./indexer.adapter";

interface ProwlarrIndexer {
  id: number;
  name: string;
  definitionName: string;
  description: string;
  language: string;
  privacy: string;
  enable: boolean;
}
interface ProwlarTorrent {
  quality: string;
  guid: string;
  size: number;
  indexer: string;
  title: string;
  publishDate: string;
  downloadUrl: string;
  infoHash: string;
  infoUrl: string;
  seeders: number | null;
  leechers: number | null;
}

export class ProwlarrAdapter extends IndexerAdapter {
  readonly indexerType: IndexerType = "prowlarr";

  constructor(indexerManager: IndexerManager) {
    super(indexerManager, "prowlarr");
  }

  async fetchApi(url: string) {
    if (!this.indexerManager.indexerApiKey) throw new BadRequestError("Indexer API key is required");
    return super.fetchApi(`api/v1/${url}`, { headers: { "X-Api-Key": this.indexerManager.indexerApiKey } });
  }

  async getIndexers(): Promise<Indexer[]> {
    return ((await this.fetchApi("indexer")) as ProwlarrIndexer[])
      .filter((idx) => !!idx.enable)
      .map((idx) => ({
        id: idx.id.toString(),
        name: idx.definitionName || idx.name,
        label: idx.name,
        lang: idx.language?.split("-")[0] || undefined,
        privacy: idx.privacy as "private" | "semi-private" | "public",
        description: idx.description || undefined,
      }));
  }

  async getTorrents(query: torrentListQuery): Promise<Torrent[]> {
    const searchQueries = [
      `{ImdbId:${query.media.imdbId}}`,
      sanitize(query.media.sanitize_title ?? ""),
      sanitize(query.media.title ?? ""),
    ].filter(Boolean);

    const fetchPromises = searchQueries.map(async (searchQuery) => {
      const params = new URLSearchParams();
      params.set("limit", "100");
      params.set("query", searchQuery);
      if (query.indexerId) params.set("indexerIds", query.indexerId);

      return (await this.fetchApi(`search?${params.toString()}`)) as ProwlarTorrent[];
    });

    const allResults = (await Promise.all(fetchPromises)).flat();

    const uniqueTorrentsMap = new Map<string, ProwlarTorrent>();

    for (const torrent of allResults) {
      const uniqueKey = torrent.infoHash || torrent.guid;
      if (uniqueKey && !uniqueTorrentsMap.has(uniqueKey)) {
        uniqueTorrentsMap.set(uniqueKey, torrent);
      }
    }

    return Array.from(uniqueTorrentsMap.values()).map((result) => ({
      ...result,
      title: result.title,
      tracker: result.indexer,
      size: result.size,
      publishDate: result.publishDate,
      seeders: result.seeders || 0,
      peers: result.leechers || 0,
      link: result.downloadUrl,
      guid: result.guid,
      quality: getTorrentQuality(result.title),
      language: getLanguageFromTitle(result.title),
      detailsUrl: result.infoUrl,
      indexerType: "prowlarr" as const,
    }));
  }
}
