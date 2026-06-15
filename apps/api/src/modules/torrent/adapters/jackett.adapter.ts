import { ServiceUnavailableError } from "@/errors/error";
import { logger } from "@/helpers/logger.helper";
import { getLanguageFromTitle, getTorrentQuality } from "@/helpers/video.helper";
import type { Torrent, TorrentIndexerQuery } from "../torrent.dto";
import type { IndexerAdapter, IndexerConfig, SearchQuery } from "./base.adapter";

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

interface JackettIndexer {
  ID: string;
  Name: string;
  Type: string;
  Language?: string;
  Description?: string;
}

export class JackettAdapter implements IndexerAdapter {
  private getApiUrl(baseUrl: string): string {
    const cleanBase = baseUrl.replace(/\/+$/, "");
    return cleanBase.includes("/api/v2.0") ? cleanBase : `${cleanBase}/api/v2.0`;
  }

  async getIndexers(config: IndexerConfig): Promise<TorrentIndexerQuery[]> {
    const apiUrl = this.getApiUrl(config.baseUrl);
    const url = new URL(`${apiUrl}/indexers`);
    url.searchParams.set("apikey", config.apiKey);
    url.searchParams.set("configured", "true");

    logger.debug("JACKETT", `GET ${url.toString()}`);
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new ServiceUnavailableError(`Jackett (${response.status} ${response.statusText})`);
    }

    const data = (await response.json()) as JackettIndexer[];

    return data.map((idx) => ({
      id: idx.ID,
      name: idx.ID,
      label: idx.Name,
      lang: idx.Language?.split("-")[0] || undefined,
      privacy: idx.Type as "private" | "semi-private" | "public",
      description: idx.Description || undefined,
    }));
  }

  private mapResults(data: JackettSearchResponse): Torrent[] {
    return (data.Results || []).map((result) => ({
      title: result.Title,
      tracker: result.Tracker,
      size: result.Size,
      publishDate: result.PublishDate,
      seeders: result.Seeders,
      peers: result.Peers,
      link: result.Link,
      guid: result.Guid,
      quality: getTorrentQuality(result.Title),
      language: getLanguageFromTitle(result.Title),
      detailsUrl: result.Details,
      indexerType: "jackett" as const,
    }));
  }

  private buildSearchUrl(apiUrl: string, config: IndexerConfig, query: SearchQuery): URL {
    const url = new URL(`${apiUrl}/indexers/all/results`);
    url.searchParams.set("apikey", config.apiKey);
    url.searchParams.set("Type", query.t);
    if (query.indexerId) {
      url.searchParams.append("Tracker[]", query.indexerId);
    }
    return url;
  }

  private async fetchSearch(url: URL, label: string): Promise<Torrent[]> {
    logger.debug("JACKETT", `GET ${url.toString()}`);
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new ServiceUnavailableError(`Jackett ${label} (${response.status} ${response.statusText})`);
    }
    const data = (await response.json()) as JackettSearchResponse;
    return this.mapResults(data);
  }

  async search(query: SearchQuery, config: IndexerConfig): Promise<Torrent[]> {
    const apiUrl = this.getApiUrl(config.baseUrl);

    if (query.imdbId) {
      const imdbUrl = this.buildSearchUrl(apiUrl, config, query);
      imdbUrl.searchParams.set("Query", query.imdbId);
      try {
        const results = await this.fetchSearch(imdbUrl, `imdb:${query.imdbId}`);
        if (results.length > 0) return results;
      } catch {
        logger.warn("JACKETT", `IMDB search failed for ${query.imdbId}, falling back to title search`);
      }
    }

    const titleUrl = this.buildSearchUrl(apiUrl, config, query);
    titleUrl.searchParams.set("Query", query.q);
    return this.fetchSearch(titleUrl, `query:${query.q}`);
  }
}
