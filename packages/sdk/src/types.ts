import type { InferResponseType } from "hono";

import type { ApiClient } from "./client";

type ActivityListResponse = InferResponseType<ApiClient["activity"]["$get"], 200>;
type TorrentListResponse = InferResponseType<ApiClient["torrents"]["list"]["$post"], 200>;
type IndexerModuleListResponse = InferResponseType<ApiClient["modules"]["indexers"]["$get"], 200>;

export type Media = InferResponseType<ApiClient["media"][":id"]["$get"], 200>;
export type Movie = InferResponseType<ApiClient["movies"][":id"]["$get"], 200>;
export type Person = InferResponseType<ApiClient["person"][":id"]["$get"], 200>;
export type TV = InferResponseType<ApiClient["tv"][":id"]["$get"], 200>;
export type User = InferResponseType<ApiClient["users"][":id"]["$get"], 200>;
export type AuthUser = InferResponseType<ApiClient["auth"]["me"]["$get"], 200>;
export type Download = InferResponseType<ApiClient["downloads"][":id"]["$get"], 200>;
export type DownloadStats = InferResponseType<ApiClient["downloads"]["stats"]["$get"], 200>;
export type Activity = ActivityListResponse["results"][number];
export type Torrent = TorrentListResponse[number];
export type TorrentInspectResult = InferResponseType<ApiClient["torrents"]["inspect"]["$get"], 200>;
export type SubdlSearchResponse = InferResponseType<ApiClient["subtitles"]["search"]["$get"], 200>;
export type ModuleIndexer = IndexerModuleListResponse[number];
export type RemoteSyncResult = InferResponseType<ApiClient["modules"]["storage"]["sync"]["$post"], 200>;
export type DownloadableFile = InferResponseType<ApiClient["downloads"][":id"]["video-file"]["$get"], 200>;
export type Module = InferResponseType<ApiClient["modules"]["$get"], 200>[number];
export type ModuleCatalogEntry = InferResponseType<ApiClient["modules"]["catalog"]["$get"], 200>[number];
export type ModuleHealth = InferResponseType<ApiClient["modules"][":id"]["health"]["$get"], 200>;

export type TMDBMovieDetails = Movie["movie"];
export type TMDBPersonDetails = Person["person"];
export type TMDBTvDetails = TV["tv"];
export type PaginatedMedia = InferResponseType<ApiClient["media"]["$get"], 200>;

export type TorrentInspectFile = TorrentInspectResult["files"][number];
export type SubdlSubtitle = SubdlSearchResponse["subtitles"][number];
export type StremioManifest = NonNullable<ModuleIndexer["manifest"]>;
export type TMDBWatchProvider = NonNullable<
  NonNullable<NonNullable<TMDBMovieDetails["watch/providers"]>["results"]>[string]["flatrate"]
>[number];

type RequestsListResponse = InferResponseType<ApiClient["requests"]["$get"], 200>;
export type MediaRequest = RequestsListResponse["results"][number];
