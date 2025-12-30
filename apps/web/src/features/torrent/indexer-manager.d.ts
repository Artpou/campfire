import type { ApiDataItem, api } from "@/lib/api";

export type IndexerManagers = ApiDataItem<ReturnType<typeof api.indexerManagers.get>>;
