import { IndexerManagerWithIndexers, User } from "@seedarr/api/types";
import { InferResponseType } from "hono";

import { api } from "./client";

export type * from "@seedarr/api/types";

export { ApiError, api, getBaseUrl, unwrap, withSessionParam } from "./client";

export type AuthUser = User & { indexerManagers?: IndexerManagerWithIndexers[] };
export type Media = InferResponseType<(typeof api.media)[":id"]["$get"]>;
export type Movie = InferResponseType<(typeof api.movies)[":id"]["$get"]>;
export type TV = InferResponseType<(typeof api.tv)[":id"]["$get"]>;

export type Download = InferResponseType<(typeof api.downloads)[":id"]["$get"]>;
export type DownloadTorrentInput = import("@seedarr/api/types").DownloadTorrentInput;
