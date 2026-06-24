export type { Language, Resolution, Source } from "@ctrl/video-filename-parser";

export type { ListActivityLogsQuery } from "../modules/activity-log/activity-log.dto";
export type { ActivityLogAction, ActivityLogType } from "../modules/activity-log/activity-log.schema";
export { loginDto, registerDto } from "../modules/auth/auth.dto";
export type { DownloadTorrentInput, TorrentLiveData, TorrentStatus } from "../modules/download/download.dto";
export type {
  CreateIndexerManagerInput,
  Indexer,
  PresetName,
  UpdateIndexerManagerInput,
} from "../modules/indexer-manager/indexer-manager.dto";
export { STREMIO_PRESETS } from "../modules/indexer-manager/indexer-manager.dto";
export type { IndexerPrivacy, IndexerType, StremioManifest } from "../modules/indexer-manager/indexer-manager.schema";
export type { ListMediaQuery, MediaInsert, MediaSelect, UpdateProgressQuery } from "../modules/media/media.dto";
export type { movieIdQuery } from "../modules/movie/movie.dto";
export type { DownloadSubtitleInput, SubdlSubtitle, SubstitlesSearchQuery } from "../modules/subtitle/subtitle.dto";
export type {
  TMDBCastMember,
  TMDBCredits,
  TMDBCrewMember,
  TMDBEpisode,
  TMDBGenre,
  TMDBItem,
  TMDBKeywordResult,
  TMDBPaginatedResponse,
  TMDBProvider,
  TMDBProvidersResponse,
  TMDBSeason,
  TMDBSeasonDetails,
  TMDBVideo,
  TMDBVideosResponse,
  TMDBWatchProvider,
  TMDBWatchProviders,
  tmdbDiscoverQuery,
  tmdbIdQuery,
  tmdbKeywordsQuery,
  tmdbListQuery,
  tmdbSearchQuery,
  tmdbTvSeasonQuery,
} from "../modules/tmdb/tmdb.dto";
export type { TorrentInspectFile, torrentInspectQuery, torrentListQuery } from "../modules/torrent/torrent.dto";
export type { CreateUserInput, UpdateUserInput } from "../modules/user/user.dto";
export type { UserRole } from "../modules/user/user.schema";
export type { Paginate, PaginationQuery } from "../shared/pagination.dto";
