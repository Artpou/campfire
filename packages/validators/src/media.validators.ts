import { type Static, Type } from "@sinclair/typebox";

// Media type enum
export const mediaTypeSchema = Type.Union([Type.Literal("movie"), Type.Literal("tv")]);

// Track media schema (for POST /media/track)
export const trackMediaSchema = Type.Object({
  id: Type.Number(),
  type: mediaTypeSchema,
  title: Type.String(),
  poster_path: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  vote_average: Type.Optional(Type.Number()),
  release_date: Type.Optional(Type.String()),
});

// Recently viewed query schema
export const recentlyViewedQuerySchema = Type.Object({
  type: Type.Optional(mediaTypeSchema),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
});

// Export types
export type MediaType = Static<typeof mediaTypeSchema>;
export type TrackMedia = Static<typeof trackMediaSchema>;
export type RecentlyViewedQuery = Static<typeof recentlyViewedQuerySchema>;
