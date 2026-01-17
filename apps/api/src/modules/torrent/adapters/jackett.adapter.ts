import { getLanguageFromTitle, getTorrentQuality } from "@/helpers/video.helper";
import { IndexerType } from "../../../db/schema";
import type { Torrent, TorrentIndexer } from "../torrent.dto";
import type { IndexerAdapter, IndexerConfig } from "./base.adapter";

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

export class JackettAdapter implements IndexerAdapter {
  private getApiUrl(baseUrl: string): string {
    // Ensure baseUrl doesn't have trailing slash and append /api/v2.0
    const cleanBase = baseUrl.replace(/\/+$/, "");
    return cleanBase.includes("/api/v2.0") ? cleanBase : `${cleanBase}/api/v2.0`;
  }

  async getIndexers(config: IndexerConfig): Promise<TorrentIndexer[]> {
    const apiUrl = this.getApiUrl(config.baseUrl);
    const url = new URL(`${apiUrl}/indexers`);
    url.searchParams.set("apikey", config.apiKey);
    url.searchParams.set("configured", "true");

    console.log(`[Jackett] GET ${url.toString()}`);
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Jackett indexers failed: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      ID: string;
      Name: string;
      Type: string;
    }[];

    return data.map((indexer) => ({
      id: indexer.ID,
      name: indexer.Name as IndexerType,
      privacy: indexer.Type as "private" | "semi-private" | "public",
    }));
  }

  async search(
    query: { q: string; t: string; indexerId?: string; categories?: string[] },
    config: IndexerConfig,
  ): Promise<Torrent[]> {
    const apiUrl = this.getApiUrl(config.baseUrl);
    const url = new URL(`${apiUrl}/indexers/all/results`);
    url.searchParams.set("apikey", config.apiKey);
    url.searchParams.set("Query", query.q);
    url.searchParams.set("Type", query.t);

    // Jackett uses the Type parameter for filtering rather than category IDs
    // Categories parameter is included for interface consistency but not used

    if (query.indexerId) {
      url.searchParams.append("Tracker[]", query.indexerId);
    }

    console.log(`[Jackett] GET ${url.toString()}`);
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Jackett indexer ${query.indexerId} failed: ${response.statusText}`);
    }

    const data = (await response.json()) as JackettSearchResponse;

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
      indexerType: "jackett",
    }));
  }
}
