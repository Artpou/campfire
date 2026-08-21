import { filenameParse } from "@ctrl/video-filename-parser";
import type { TorrentListQuery } from "@seedarr/contracts";

import { BadRequestError } from "@/shared/errors/error";

import type { Indexer, IndexerModule } from "@/modules/module/indexer/module-indexer.types";
import type { Torrent } from "../torrent.types";
import { buildIndexerSearchPlan, searchWithTitleFallback } from "../torrent-search.helper";
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
  readonly indexerType: IndexerModule["indexerType"] = "prowlarr";

  constructor(indexerManager: IndexerModule) {
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

  async getTorrents(query: TorrentListQuery): Promise<Torrent[]> {
    const plan = buildIndexerSearchPlan(query.media, (imdbId) => `{ImdbId:${imdbId}}`);

    const allResults = await searchWithTitleFallback(plan, async (searchQuery) => {
      const params = new URLSearchParams();
      params.set("limit", "100");
      params.set("query", searchQuery);
      if (query.indexerId) params.set("indexerIds", query.indexerId);

      return (await this.fetchApi(`search?${params.toString()}`)) as ProwlarTorrent[];
    });

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
      detailsUrl: result.infoUrl,
      indexerType: "prowlarr" as const,
      mediaInfos: filenameParse(result.title, query.media.type === "tv"),
    }));
  }
}
