import type { InferResponseType } from "hono";

import type { ApiClient } from "./client";

type ActivityLogsListResponse = InferResponseType<ApiClient["activity-logs"]["$get"], 200>;
type TorrentListResponse = InferResponseType<ApiClient["torrents"]["list"]["$post"], 200>;
type IndexerManagerListResponse = InferResponseType<ApiClient["indexer-manager"]["$get"], 200>;

export type Media = InferResponseType<ApiClient["media"][":id"]["$get"], 200>;
export type Movie = InferResponseType<ApiClient["movies"][":id"]["$get"], 200>;
export type Person = InferResponseType<ApiClient["person"][":id"]["$get"], 200>;
export type TV = InferResponseType<ApiClient["tv"][":id"]["$get"], 200>;
export type User = InferResponseType<ApiClient["users"][":id"]["$get"], 200>;
export type AuthUser = InferResponseType<ApiClient["auth"]["me"]["$get"], 200>;
export type Download = InferResponseType<ApiClient["downloads"][":id"]["$get"], 200>;
export type DownloadStats = InferResponseType<ApiClient["downloads"]["stats"]["$get"], 200>;
export type ActivityLog = ActivityLogsListResponse["results"][number];
export type Torrent = TorrentListResponse[number];
export type TorrentInspectResult = InferResponseType<ApiClient["torrents"]["inspect"]["$get"], 200>;
export type SubdlSearchResponse = InferResponseType<ApiClient["subtitles"]["search"]["$get"], 200>;
export type IndexerManager = IndexerManagerListResponse[number];
export type IndexerManagerDetail = InferResponseType<ApiClient["indexer-manager"][":id"]["$get"], 200>;
export type Settings = InferResponseType<ApiClient["settings"]["$get"], 200>;
export type TmdbKeyStatus = InferResponseType<ApiClient["settings"]["tmdb-key-status"]["$get"], 200>;
export type StorageConfig = InferResponseType<ApiClient["storage-config"]["$get"], 200>;
export type StorageStatus = InferResponseType<ApiClient["storage-config"]["status"]["$get"], 200>;
export type RemoteSyncResult = InferResponseType<ApiClient["storage-config"]["sync"]["$post"], 200>;

export type TMDBMovieDetails = Movie["movie"];
export type TMDBPersonDetails = Person["person"];
export type TMDBTvDetails = TV["tv"];
export type PaginatedMedia = InferResponseType<ApiClient["media"]["$get"], 200>;
