import { filenameParse } from "@ctrl/video-filename-parser";

import type { Indexer, IndexerManager } from "@/types";
import type { Torrent, torrentListQuery } from "../torrent.dto";
import { IndexerAdapter } from "./indexer.adapter";

interface StremioTorrent {
  name: string;
  title: string;
  infoHash: string;
  fileIdx: number;
  behaviorHints?: {
    bingeGroup?: string;
    filename?: string;
  };
}

interface StremioResponse {
  streams: StremioTorrent[];
  cacheMaxAge: number;
  staleRevalidate: string;
  staleError: string;
}

function parseSeeders(title: string): number {
  const match = title.match(/👤\s*(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function parseSize(title: string): number {
  const match = title.match(/💾\s*([\d.]+)\s*(GB|MB|KB)/i);
  if (!match) return 0;
  const value = Number.parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === "GB") return value * 1e9;
  if (unit === "MB") return value * 1e6;
  if (unit === "KB") return value * 1e3;
  return 0;
}

function parseSource(title: string): string {
  const match = title.match(/⚙️\s*(.+?)(?:\n|$)/);
  return match ? match[1].trim() : "Torrentio";
}

export class StremioAdapter extends IndexerAdapter {
  constructor(indexerManager: IndexerManager) {
    super(indexerManager, "stremio");
  }

  async getIndexers(): Promise<Indexer[]> {
    return Promise.resolve([]);
  }

  async getTorrents(query: torrentListQuery): Promise<Torrent[]> {
    const media = query.media;

    console.log("media", media);

    let videoId = media.imdbId;
    if (media.type === "tv") {
      const season = query.season ?? 1;
      // Stremio requires a specific episode; default to E01 when browsing a full season
      const episode = query.episode ?? 1;
      videoId = `${media.imdbId}:${season}:${episode}`;
    }

    const data = (await this.fetchApi(`stream/${media.type}/${videoId}.json`)) as StremioResponse;

    return data.streams.map((stream) => {
      const filename = stream.behaviorHints?.filename ?? "";
      const displayTitle = filename || stream.title.split("\n")[0];

      return {
        title: displayTitle,
        tracker: parseSource(stream.title),
        size: parseSize(stream.title),
        publishDate: new Date().toISOString(),
        seeders: parseSeeders(stream.title),
        peers: 0,
        link: `magnet:?xt=urn:btih:${stream.infoHash}`,
        guid: stream.infoHash,
        detailsUrl: undefined,
        indexerType: "stremio",
        magnetUrl: `magnet:?xt=urn:btih:${stream.infoHash}`,
        mediaInfos: filenameParse(displayTitle, true),
      };
    });
  }
}
