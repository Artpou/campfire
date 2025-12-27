import { type Static, Type } from "@sinclair/typebox";

// IndexerManager name enum
export const indexerManagerNameSchema = Type.Union([
  Type.Literal("prowlarr"),
  Type.Literal("jackett"),
]);

// Create indexerManager schema
export const createIndexerManagerSchema = Type.Object({
  name: indexerManagerNameSchema,
  apiKey: Type.Optional(Type.String()),
  baseUrl: Type.Optional(Type.String({ format: "uri" })),
  selected: Type.Optional(Type.Boolean()),
});

// Update indexerManager schema
export const updateIndexerManagerSchema = Type.Object({
  name: indexerManagerNameSchema,
  apiKey: Type.Optional(Type.String()),
  baseUrl: Type.Optional(Type.Union([Type.String({ format: "uri" }), Type.Null()])),
  selected: Type.Optional(Type.Boolean()),
});

// IndexerManager output schema
export const indexerManagerOutputSchema = Type.Object({
  id: Type.String(),
  userId: Type.String(),
  name: indexerManagerNameSchema,
  apiKey: Type.String(),
  baseUrl: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.Any(), // Date type
  updatedAt: Type.Any(), // Date type
});

// Export types
export type IndexerManagerName = Static<typeof indexerManagerNameSchema>;
export type CreateIndexerManager = Static<typeof createIndexerManagerSchema>;
export type UpdateIndexerManager = Static<typeof updateIndexerManagerSchema>;
export type IndexerManagerOutput = Static<typeof indexerManagerOutputSchema>;
