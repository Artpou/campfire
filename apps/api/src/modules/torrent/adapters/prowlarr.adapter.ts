import { ServiceUnavailableError } from "@/errors/error";
import { logger } from "@/helpers/logger.helper";
import { getLanguageFromTitle, getTorrentQuality } from "@/helpers/video.helper";
import type { Torrent, TorrentIndexerQuery } from "../torrent.dto";
import type { IndexerAdapter, IndexerConfig, SearchQuery } from "./base.adapter";

interface ProwlarrSearchItem {
  quality: string;
  guid: string;
  size: number;
  indexer: string;
  title: string;
  publishDate: string;
  downloadUrl: string;
  infoUrl: string;
  seeders: number | null;
  leechers: number | null;
}

interface ProwlarrIndexer {
  id: number;
  name: string;
  definitionName: string;
  description: string;
  language: string;
  privacy: string;
  enable: boolean;
}

export class ProwlarrAdapter implements IndexerAdapter {
  private getApiUrl(baseUrl: string): string {
    const cleanBase = baseUrl.replace(/\/+$/, "");
    return cleanBase.includes("/api/v1") ? cleanBase : `${cleanBase}/api/v1`;
  }

  async getIndexers(config: IndexerConfig): Promise<TorrentIndexerQuery[]> {
    const apiUrl = this.getApiUrl(config.baseUrl);
    const url = `${apiUrl}/indexer`;

    logger.debug("PROWLARR", `GET ${url}`);
    const response = await fetch(url, {
      headers: { "X-Api-Key": config.apiKey },
    });

    if (!response.ok) {
      throw new ServiceUnavailableError(`Prowlarr (${response.status} ${response.statusText})`);
    }

    const data = (await response.json()) as ProwlarrIndexer[];

    return data
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

  private mapResults(data: ProwlarrSearchItem[]): Torrent[] {
    return data.map((result) => ({
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

  private buildSearchUrl(apiUrl: string, query: SearchQuery, searchTerm: string): URL {
    const url = new URL(`${apiUrl}/search`);
    url.searchParams.set("query", searchTerm);
    url.searchParams.set("limit", "100");

    if (query.categories && query.categories.length > 0) {
      for (const category of query.categories) {
        url.searchParams.append("categories", category);
      }
    }
    if (query.indexerId) {
      url.searchParams.set("indexerIds", query.indexerId);
    }

    return url;
  }

  private async fetchSearch(url: URL, config: IndexerConfig, label: string): Promise<Torrent[]> {
    logger.debug("PROWLARR", `GET ${url.toString()}`);
    const response = await fetch(url.toString(), {
      headers: { "X-Api-Key": config.apiKey },
    });

    if (!response.ok) {
      throw new ServiceUnavailableError(`Prowlarr ${label} (${response.status} ${response.statusText})`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new ServiceUnavailableError(`Prowlarr ${label} (invalid response)`);
    }

    return this.mapResults(data);
  }

  async search(query: SearchQuery, config: IndexerConfig): Promise<Torrent[]> {
    const apiUrl = this.getApiUrl(config.baseUrl);

    if (query.imdbId) {
      const imdbUrl = this.buildSearchUrl(apiUrl, query, `{ImdbId:${query.imdbId}}`);
      try {
        const results = await this.fetchSearch(imdbUrl, config, `imdb:${query.imdbId}`);
        if (results.length > 0) return results;
      } catch {
        logger.warn("PROWLARR", `IMDB search failed for ${query.imdbId}, falling back to title search`);
      }
    }

    const titleUrl = this.buildSearchUrl(apiUrl, query, query.q);
    return this.fetchSearch(titleUrl, config, `query:${query.q}`);
  }
}
