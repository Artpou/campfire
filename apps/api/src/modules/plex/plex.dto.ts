import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { plexConfig } from "@/db/schema";

// Database schemas
export const plexConfigSelectSchema = createSelectSchema(plexConfig);
export const plexConfigInsertSchema = createInsertSchema(plexConfig);

// Exported types
export type PlexConfig = typeof plexConfigSelectSchema._output;
export type NewPlexConfig = typeof plexConfigInsertSchema._input;

// Request schemas
export const updatePlexConfigSchema = z.object({
  hostname: z.string().optional(),
  port: z.number().optional(),
  token: z.string().optional(),
  serverName: z.string().optional(),
  machineIdentifier: z.string().optional(),
  useSsl: z.boolean().optional(),
  syncMovies: z.boolean().optional(),
  syncTv: z.boolean().optional(),
  syncDownloads: z.boolean().optional(),
});

export type UpdatePlexConfigInput = z.infer<typeof updatePlexConfigSchema>;

export const plexSyncSchema = z.object({
  movies: z.boolean().optional(),
  tv: z.boolean().optional(),
  downloads: z.boolean().optional(),
});

export type PlexSyncInput = z.infer<typeof plexSyncSchema>;
