import { IndexerManager, User } from "@seedarr/api/types";
import { InferResponseType } from "hono";

import { api } from "./client";

export type * from "@seedarr/api/types";

export { ApiError, api, getBaseUrl, unwrap } from "./client";

export type AuthUser = User & { sessionToken: string; selectedIndexer?: IndexerManager };
export type Media = InferResponseType<(typeof api.media)[":id"]["$get"]>;
export type Movie = InferResponseType<(typeof api.movies)[":id"]["$get"]>;
export type TV = InferResponseType<(typeof api.tv)[":id"]["$get"]>;
