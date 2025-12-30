import type { ApiData, ApiDataItem, api } from "@/lib/api";

export type Torrent = ApiData<ReturnType<typeof api.torrents.search.get>>["recommended"][number];
export type TorrentIndexer = ApiDataItem<ReturnType<typeof api.torrents.indexers.get>>;
