import { getLanguageFromTitle, getTorrentQuality } from "@/helpers/video.helper";
import { IndexerType } from "../../../db/schema";
import { IndexerAdapter, Torrent, TorrentIndexer, TorrentQuality } from "./base.adapter";

interface ProwlarrSearchItem {
  quality: TorrentQuality;
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
  private baseUrl = "http://localhost:9696/api/v1";

  async getIndexers(apiKey: string): Promise<TorrentIndexer[]> {
    const url = `${this.baseUrl}/indexer`;

    console.log(`[Prowlarr] GET ${url}`);
    const response = await fetch(url, {
      headers: { "X-Api-Key": apiKey },
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
    apiKey: string,
  ): Promise<Torrent[]> {
    const url = new URL(`${this.baseUrl}/search`);
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
      headers: { "X-Api-Key": apiKey },
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
