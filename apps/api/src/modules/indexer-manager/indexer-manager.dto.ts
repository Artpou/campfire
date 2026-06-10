import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { indexerManager, indexerTypeEnum } from "@/modules/indexer-manager/indexer-manager.schema";

const indexerManagerSelectSchema = createSelectSchema(indexerManager);
export type IndexerManager = typeof indexerManagerSelectSchema._output;

export const upsertIndexerManagerDto = z.object({
  indexerType: z.enum(indexerTypeEnum),
  indexerUrl: z.string().min(1),
  indexerApiKey: z.string().min(1),
});
export type UpsertIndexerManagerInput = z.infer<typeof upsertIndexerManagerDto>;
