// Export all route types for RPC

// Export enums from schema (these are needed for type constraints)
export type { IndexerType, MediaType, TorrentStatus, UserRole } from "./db/schema";
// Export DTO types (TypeScript types only, not Zod schemas)
export type { LoginInput, RegisterInput } from "./modules/auth/auth.dto";
// Export route types
export type { AuthRoutesType } from "./modules/auth/auth.route";
// Download types
export type {
  DownloadTorrentInput,
  NewTorrentDownload,
  TorrentDownload,
  TorrentLiveData,
} from "./modules/download/download.dto";
export type { DownloadRoutesType } from "./modules/download/download.route";
export type { FreeboxFile, FreeboxFilesResponse } from "./modules/freebox/freebox.dto";
export type { FreeboxRoutesType } from "./modules/freebox/freebox.route";
export type {
  CreateIndexerManagerInput,
  IndexerManager,
  NewIndexerManager,
} from "./modules/indexer-manager/indexer-manager.dto";
export type { IndexerManagerRoutesType } from "./modules/indexer-manager/indexer-manager.route";
export type {
  ListMediaParams,
  Media,
  MediaFilter,
  MediaStatus,
} from "./modules/media/media.dto";
export type { MediaRoutesType } from "./modules/media/media.route";
// Pagination types
export type { Paginate, PaginationParams } from "./modules/pagination/pagination.dto";
// Shared types
export type { Ids } from "./modules/shared/shared.dto";
// Torrent search types
export type {
  Torrent,
  TorrentIndexer,
  TorrentInspectFile,
  TorrentInspectResult,
  TorrentLanguage,
  TorrentQuality,
} from "./modules/torrent/torrent.dto";
export type { TorrentRoutesType } from "./modules/torrent/torrent.route";
export type { CreateUserInput, NewUser, UpdateUserInput, User } from "./modules/user/user.dto";
export type { UserRoutesType } from "./modules/user/user.route";
// Export main app type
export type { AppType } from "./server";

// API-serialized types (Date -> string for JSON)
import type { TorrentDownload as TorrentDownloadDTO } from "./modules/download/download.dto";
import type { User as UserDTO } from "./modules/user/user.dto";

export type UserSerialized = Omit<UserDTO, "createdAt"> & {
  createdAt: string;
  sessionToken?: string;
};

export type TorrentDownloadSerialized = Omit<
  TorrentDownloadDTO,
  "createdAt" | "startedAt" | "completedAt"
> & {
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};
