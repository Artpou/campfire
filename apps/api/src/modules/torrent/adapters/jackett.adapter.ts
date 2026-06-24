import { filenameParse } from "@ctrl/video-filename-parser";

import { BadRequestError } from "@/errors/error";
import { logger } from "@/helpers/logger.helper";
import type { Indexer, IndexerManager, IndexerType } from "@/types";
import type { Torrent, torrentListQuery } from "../torrent.dto";
import { IndexerAdapter } from "./indexer.adapter";

interface JackettIndexer {
  ID: string;
  Name: string;
  Type: string;
  Language?: string;
  Description?: string;
}

interface JackettSearchItem {
  Title: string;
  Tracker: string;
  Size: number;
  PublishDate: string;
  Seeders: number;
  Peers: number;
  Link: string;
  Guid: string;
  Details: string;
}

interface JackettSearchResponse {
  Results: JackettSearchItem[];
}

export class JackettAdapter extends IndexerAdapter {
  readonly indexerType: IndexerType = "jackett";

  constructor(indexerManager: IndexerManager) {
    super(indexerManager, "jackett");
  }

  async fetchApi(url: string) {
    if (!this.indexerManager.indexerApiKey) throw new BadRequestError("Indexer API key is required");

    let cleanUrl = url.replace(/^\/+/, "");
    if (!cleanUrl.startsWith("api/v2.0")) {
      cleanUrl = `api/v2.0/${cleanUrl}`;
    }

    const separator = cleanUrl.includes("?") ? "&" : "?";
    const authenticatedUrl = `${cleanUrl}${separator}apikey=${this.indexerManager.indexerApiKey}`;

    return super.fetchApi(authenticatedUrl);
  }

  async getIndexers(): Promise<Indexer[]> {
    const data = (await this.fetchApi("indexers?configured=true")) as JackettIndexer[];

    return data.map((idx) => ({
      id: idx.ID,
      name: idx.ID,
      label: idx.Name,
      lang: idx.Language?.split("-")[0] || undefined,
      privacy: idx.Type as "private" | "semi-private" | "public",
      description: idx.Description || undefined,
    }));
  }

  async getTorrents(query: torrentListQuery): Promise<Torrent[]> {
    const searchQueries = [query.media.imdbId ?? "", query.media.sanitize_title ?? "", query.media.title ?? ""].filter(
      Boolean,
    );

    const fetchPromises = searchQueries.map(async (searchQuery) => {
      let path = `indexers/all/results?Query=${encodeURIComponent(searchQuery)}`;
      if (query.indexerId) {
        path += `&Tracker[]=${encodeURIComponent(query.indexerId)}`;
      }

      try {
        const response = (await this.fetchApi(path)) as JackettSearchResponse;
        return response.Results || [];
      } catch (error) {
        logger.error("JACKETT", `Error for query "${searchQuery}":`, error);
        return [];
      }
    });

    const allResults = (await Promise.all(fetchPromises)).flat();

    const uniqueTorrentsMap = new Map<string, JackettSearchItem>();

    for (const torrent of allResults) {
      const uniqueKey = torrent.Guid || torrent.Link;
      if (uniqueKey && !uniqueTorrentsMap.has(uniqueKey)) {
        uniqueTorrentsMap.set(uniqueKey, torrent);
      }
    }

    // 5. Mapping final standardisé vers ton format d'application
    return Array.from(uniqueTorrentsMap.values()).map((result) => ({
      title: result.Title,
      tracker: result.Tracker,
      size: result.Size,
      publishDate: result.PublishDate,
      seeders: result.Seeders || 0,
      peers: result.Peers || 0,
      link: result.Link,
      guid: result.Guid,
      detailsUrl: result.Details,
      indexerType: "jackett" as const,
      mediaInfos: filenameParse(result.Title),
    }));
  }
}
