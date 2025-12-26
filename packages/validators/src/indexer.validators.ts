import { type Static, Type } from "@sinclair/typebox";

// Indexer name enum
export const indexerNameSchema = Type.Union([Type.Literal("prowlarr"), Type.Literal("jackett")]);

// Create indexer schema
export const createIndexerSchema = Type.Object({
  name: indexerNameSchema,
  apiKey: Type.String({
    minLength: 1,
    description: "API key is required.",
  }),
  baseUrl: Type.Optional(Type.String({ format: "uri" })),
});

// Update indexer schema
export const updateIndexerSchema = Type.Object({
  name: Type.Optional(indexerNameSchema),
  apiKey: Type.Optional(
    Type.String({
      minLength: 1,
      description: "API key is required.",
    }),
  ),
  baseUrl: Type.Optional(Type.Union([Type.String({ format: "uri" }), Type.Null()])),
});

// Indexer output schema
export const indexerOutputSchema = Type.Object({
  id: Type.String(),
  userId: Type.String(),
  name: indexerNameSchema,
  apiKey: Type.String(),
  baseUrl: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.Any(), // Date type
  updatedAt: Type.Any(), // Date type
});

// Export types
export type IndexerName = Static<typeof indexerNameSchema>;
export type CreateIndexer = Static<typeof createIndexerSchema>;
export type UpdateIndexer = Static<typeof updateIndexerSchema>;
export type IndexerOutput = Static<typeof indexerOutputSchema>;
