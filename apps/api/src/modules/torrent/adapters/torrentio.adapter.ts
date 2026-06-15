import { ServiceUnavailableError } from "@/errors/error";
import { logger } from "@/helpers/logger.helper";
import { getLanguageFromTitle, getTorrentQuality } from "@/helpers/video.helper";
import type { Torrent, TorrentIndexerQuery } from "../torrent.dto";
import type { IndexerAdapter, IndexerConfig, SearchQuery } from "./base.adapter";

interface TorrentioStream {
  name: string;
  title: string;
  infoHash: string;
  fileIdx: number;
  behaviorHints?: {
    bingeGroup?: string;
    filename?: string;
  };
}

interface TorrentioResponse {
  streams: TorrentioStream[];
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

export class TorrentioAdapter implements IndexerAdapter {
  async getIndexers(_config: IndexerConfig): Promise<TorrentIndexerQuery[]> {
    return [
      {
        id: "torrentio",
        name: "torrentio",
        label: "Torrentio",
        privacy: "public",
      },
    ];
  }

  async search(query: SearchQuery, config: IndexerConfig): Promise<Torrent[]> {
    if (!query.imdbId) return [];

    const baseUrl = config.baseUrl.replace(/\/+$/, "");
    const providers = config.providers ?? [];
    const providerPath = providers.length > 0 ? `providers=${providers.join(",")}` : "";
    const type = query.t === "movie" ? "movie" : "series";

    let videoId = query.imdbId;
    if (type === "series") {
      const season = query.season ?? 1;
      const episode = query.episode ?? 1;
      videoId = `${query.imdbId}:${season}:${episode}`;
    }

    const url = providerPath
      ? `${baseUrl}/${providerPath}/stream/${type}/${videoId}.json`
      : `${baseUrl}/stream/${type}/${videoId}.json`;

    logger.debug("TORRENTIO", `GET ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new ServiceUnavailableError(`Torrentio (${response.status} ${response.statusText})`);
    }

    const data = (await response.json()) as TorrentioResponse;
    if (!data.streams) return [];

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
        quality: getTorrentQuality(`${stream.name} ${displayTitle}`),
        language: getLanguageFromTitle(stream.title),
        detailsUrl: undefined,
        indexerType: "torrentio" as const,
        magnetUrl: `magnet:?xt=urn:btih:${stream.infoHash}`,
      };
    });
  }
}
