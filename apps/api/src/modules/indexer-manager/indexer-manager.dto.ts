import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { indexerManager, indexerTypeEnum } from "@/modules/indexer-manager/indexer-manager.schema";

const indexerManagerSelectSchema = createSelectSchema(indexerManager);
export type IndexerManager = typeof indexerManagerSelectSchema._output;

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

export const createIndexerManagerDto = z.object({
  indexerType: z.enum(indexerTypeEnum),
  indexerUrl: z.string().optional(),
  indexerApiKey: z.string().optional(),
  providers: z.array(z.string()).optional(),
});
export type CreateIndexerManagerInput = z.infer<typeof createIndexerManagerDto>;

export const updateIndexerManagerDto = z.object({
  indexerUrl: z.string().optional(),
  indexerApiKey: z.string().optional(),
  providers: z.array(z.string()).optional(),
  disabled: z.boolean().optional(),
});
export type UpdateIndexerManagerInput = z.infer<typeof updateIndexerManagerDto>;
