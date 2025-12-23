export interface JackettSearchItem {
  FirstSeen: string;
  Tracker: string;
  TrackerId: string;
  TrackerType: "private" | "public";
  CategoryDesc: string;
  BlackholeLink: string | null;
  Title: string;
  Guid: string;
  Link: string;
  Details: string;
  PublishDate: string;
  Category: number[];
  Size: number;
  Files: number | null;
  Grabs: number;
  Description: string | null;
  RageID: number | null;
  TVDBId: number | null;
  Imdb: string | null;
  TMDb: number | null;
  TVMazeId: number | null;
  TraktId: number | null;
  DoubanId: number | null;
  Genres: string[] | null;
  Languages: string[];
  Subs: string[];
  Year: number | null;
  Author: string | null;
  BookTitle: string | null;
  Publisher: string | null;
  Artist: string | null;
  Album: string | null;
  Label: string | null;
  Track: string | null;
  Seeders: number;
  Peers: number;
  Poster: string | null;
  InfoHash: string | null;
  MagnetUri: string | null;
  MinimumRatio: number | null;
  MinimumSeedTime: number | null;
  DownloadVolumeFactor: number;
  UploadVolumeFactor: number;
  Gain: number;
}

export interface JackettSearchResponse {
  Results: JackettSearchItem[];
}

export interface ProwlarrSearchItem {
  guid: string;
  age: number;
  ageHours: number;
  ageMinutes: number;
  size: number;
  indexerId: number;
  indexer: string;
  title: string;
  sortTitle: string;
  imdbId: number | null;
  tmdbId: number | null;
  tvdbId: number | null;
  tvMazeId: number | null;
  publishDate: string;
  downloadUrl: string;
  infoUrl: string;
  indexerFlags: string[];
  seeders: number | null;
  leechers: number | null;
  protocol: string;
  fileName: string | null;
}

export type TorrentQuality = "SD" | "HD" | "2K" | "4K" | undefined;

export interface Indexer {
  id: string;
  name: string;
  privacy: "private" | "semi-private" | "public";
}

export interface Torrent {
  title: string;
  tracker: string;
  size: number;
  publishDate: string;
  seeders: number;
  peers: number;
  link: string;
  guid: string;
  quality: TorrentQuality;
  detailsUrl?: string;
  indexerType: "jackett" | "prowlarr";
}

export interface TorrentSearchResponse {
  recommended: Torrent[];
  others: Torrent[];
}
