import { getLanguageFromTitle, getTorrentQuality } from "@/helpers/video.helper";
import { IndexerType } from "../../../db/schema";
import type { Torrent, TorrentIndexer } from "../torrent.dto";
import type { IndexerAdapter, IndexerConfig } from "./base.adapter";

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

export class ProwlarrAdapter implements IndexerAdapter {
  private getApiUrl(baseUrl: string): string {
    // Ensure baseUrl doesn't have trailing slash and append /api/v1
    const cleanBase = baseUrl.replace(/\/+$/, "");
    return cleanBase.includes("/api/v1") ? cleanBase : `${cleanBase}/api/v1`;
  }

  async getIndexers(config: IndexerConfig): Promise<TorrentIndexer[]> {
    const apiUrl = this.getApiUrl(config.baseUrl);
    const url = `${apiUrl}/indexer`;

    console.log(`[Prowlarr] GET ${url}`);
    const response = await fetch(url, {
      headers: { "X-Api-Key": config.apiKey },
    });

    if (!response.ok) {
      throw new Error(`Prowlarr indexers failed: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      id: number;
      name: string;
      privacy: string;
      enable: boolean;
    }[];

    return data
      .filter((indexer) => !!indexer.enable)
      .map((indexer) => ({
        id: indexer.id.toString(),
        name: indexer.name as IndexerType,
        privacy: indexer.privacy as "private" | "semi-private" | "public",
      }));
  }

  async search(
    query: { q: string; t: string; indexerId?: string; categories?: string[] },
    config: IndexerConfig,
  ): Promise<Torrent[]> {
    const apiUrl = this.getApiUrl(config.baseUrl);
    const url = new URL(`${apiUrl}/search`);
    url.searchParams.set("query", query.q);
    url.searchParams.set("limit", "100");

    // Add categories if provided
    if (query.categories && query.categories.length > 0) {
      for (const category of query.categories) {
        url.searchParams.append("categories", category);
      }
    }

    if (query.indexerId) {
      url.searchParams.set("indexerIds", query.indexerId);
    }

    console.log(`[Prowlarr] GET ${url.toString()}`);
    const response = await fetch(url.toString(), {
      headers: { "X-Api-Key": config.apiKey },
    });

    if (!response.ok) {
      console.log(response.json());
      throw new Error(`Prowlarr indexer ${query.indexerId} failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error(`Prowlarr indexer ${query.indexerId} returned invalid response`);
    }

    return data.map((result: ProwlarrSearchItem) => ({
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
      indexerType: "prowlarr",
    }));
  }
}
