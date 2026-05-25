import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { indexerManager, indexerTypeEnum } from "@/db/schema";

// Database schemas
export const indexerManagerSelectSchema = createSelectSchema(indexerManager);
export const indexerManagerInsertSchema = createInsertSchema(indexerManager);

// Exported types
export type IndexerManager = typeof indexerManagerSelectSchema._output;
export type NewIndexerManager = typeof indexerManagerInsertSchema._input;

// Request schemas
export const upsertIndexerManagerSchema = z.object({
  indexerType: z.enum(indexerTypeEnum),
  indexerUrl: z.string().min(1),
  indexerApiKey: z.string().min(1),
});

export type UpsertIndexerManagerInput = z.infer<typeof upsertIndexerManagerSchema>;
