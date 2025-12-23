import { getTorrentQuality } from "@/helpers/video";
import { JackettSearchResponse, Torrent } from "@/types";

import { Indexer, ProwlarrSearchItem } from "./torrent.d";

export class TorrentService {
  private jackettUrl = "http://localhost:9117/api/v2.0/indexers/all/results";
  private jackettIndexersUrl = "http://localhost:9117/api/v2.0/indexers";
  private prowlarrUrl = "http://localhost:9696/api/v1/search";
  private prowlarrIndexersUrl = "http://localhost:9696/api/v1/indexer";

  async getIndexers(indexer: "jackett" | "prowlarr", apiKey: string): Promise<Indexer[]> {
    if (indexer === "jackett") {
      return this.getJackettIndexers(apiKey);
    }
    return this.getProwlarrIndexers(apiKey);
  }

  private async getJackettIndexers(apiKey: string): Promise<Indexer[]> {
    const url = new URL(this.jackettIndexersUrl);
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("configured", "true"); // Map user's "configured=false" which usually means available. Assuming active indexers.

    try {
      const response = await fetch(url.toString());
      if (!response.ok) return [];

      const data = (await response.json()) as { ID: string; Name: string; Type: string }[];
      // User specified ID, Name, Type (privacy) mapping.
      return data.map((indexer) => ({
        id: indexer.ID,
        name: indexer.Name,
        privacy: indexer.Type as "private" | "semi-private" | "public",
      }));
    } catch (error) {
      console.error("Failed to fetch Jackett indexers", error);
      return [];
    }
  }

  private async getProwlarrIndexers(apiKey: string): Promise<Indexer[]> {
    try {
      const response = await fetch(this.prowlarrIndexersUrl, {
        headers: { "X-Api-Key": apiKey },
      });
      if (!response.ok) return [];

      const data = (await response.json()) as { id: number; name: string; privacy: string }[];
      return data.map((indexer) => ({
        id: indexer.id.toString(),
        name: indexer.name,
        privacy: indexer.privacy as "private" | "semi-private" | "public",
      }));
    } catch (error) {
      console.error("Failed to fetch Prowlarr indexers", error);
      return [];
    }
  }

  private async searchJackett(
    query: { q: string; t: string; indexerId?: string },
    apiKey: string,
  ): Promise<Torrent[]> {
    const url = new URL(this.jackettUrl);
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("Query", query.q);
    url.searchParams.set("Type", query.t);
    if (query.indexerId) {
      // Jackett uses 'Tracker[]' parameter for filtering by indexer
      url.searchParams.append("Tracker[]", query.indexerId);
    }

    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        console.error("Jackett API error:", response.statusText);
        return [];
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
        detailsUrl: result.Details,
        indexerType: "jackett",
      }));
    } catch (error) {
      console.error("Jackett search failed:", error);
      return [];
    }
  }

  private async searchProwlarr(
    query: { q: string; indexerId?: string },
    apiKey: string,
  ): Promise<Torrent[]> {
    const url = new URL(this.prowlarrUrl);
    url.searchParams.set("query", query.q);
    url.searchParams.set("limit", "100");
    if (query.indexerId) {
      url.searchParams.set("indexerIds", query.indexerId);
    }

    try {
      const response = await fetch(url.toString(), {
        headers: {
          "X-Api-Key": apiKey,
        },
      });

      if (!response.ok) {
        console.error("Prowlarr API error:", response.statusText);
        return [];
      }

      const data = (await response.json()) as ProwlarrSearchItem[];

      return data.map((result) => ({
        title: result.title,
        tracker: result.indexer,
        size: result.size,
        publishDate: result.publishDate,
        seeders: result.seeders || 0,
        peers: result.leechers || 0,
        link: result.downloadUrl,
        guid: result.guid,
        quality: getTorrentQuality(result.title),
        detailsUrl: result.infoUrl,
        indexerType: "prowlarr",
      }));
    } catch (error) {
      console.error("Prowlarr search failed:", error);
      return [];
    }
  }

  async searchTorrents(query: {
    q: string;
    t: string;
    year?: string;
    indexer: "jackett" | "prowlarr";
    apiKey: string;
    indexerId?: string;
  }): Promise<{ recommended: Torrent[]; others: Torrent[] }> {
    let torrents: Torrent[] = [];

    if (query.indexer === "prowlarr") {
      torrents = await this.searchProwlarr(
        { q: query.q, indexerId: query.indexerId },
        query.apiKey,
      );
    } else {
      torrents = await this.searchJackett(
        { q: query.q, t: query.t, indexerId: query.indexerId },
        query.apiKey,
      );
    }

    // Sort by seeders desc initially
    torrents.sort((a, b) => b.seeders - a.seeders);

    if (query.year) {
      const year = query.year;
      const recommended = torrents.filter((t) => t.title.includes(year));
      const others = torrents.filter((t) => !t.title.includes(year));
      return { recommended, others };
    }

    return { recommended: torrents, others: [] };
  }
}

export const torrentService = new TorrentService();
