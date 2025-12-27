export type { Indexer, Media } from "./db/schema";
export type {
  Torrent,
  TorrentIndexer,
  TorrentQuality,
} from "./modules/torrent/adapters/base.adapter";

// Union type for handling both TMDB API responses and our database Media type
// TMDB returns 'name' for TV shows, but we store as 'title' in our DB
export type MediaItem =
  | Media
  | {
      id: number;
      title?: string;
      name?: string;
      poster_path?: string | null;
      vote_average?: number;
      release_date?: string;
      first_air_date?: string;
    };
