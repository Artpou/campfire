import type { IndexerManager } from "@/modules/indexer-manager/indexer-manager.schema";

export type Indexer = {
  id: string;
  name: string;
  label?: string;
  lang?: string;
  description?: string;
  privacy?: "public" | "semi-private" | "private";
};

export type IndexerManagerWithIndexers = IndexerManager & {
  indexers: Indexer[];
};
