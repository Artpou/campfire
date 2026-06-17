export const STREMIO_PRESETS = [
  {
    value: "torrentio" as const,
    label: "Torrentio",
    emoji: "\u{1F7E2}",
    description: "The gold standard, movies & series",
  },
  {
    value: "comet" as const,
    label: "Comet",
    emoji: "\u2604\uFE0F",
    description: "Ultra-fast lightweight scraper",
  },
  {
    value: "mediafusion" as const,
    label: "MediaFusion",
    emoji: "\u{1F988}",
    description: "Great for movies, live TV & anime",
  },
] as const;

export const INDEXER_DEFAULTS: Record<string, string> = {
  jackett: "http://localhost:9117",
  prowlarr: "http://localhost:9696",
};
