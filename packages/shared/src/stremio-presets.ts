export type StremioPresetName = "torrentio" | "comet" | "mediafusion";

export type StremioPresetDefinition = {
  value: StremioPresetName;
  manifestUrl: string;
  label: string;
  description: string;
  image?: string;
  emoji?: string;
};

export const STREMIO_PRESET_DEFINITIONS: StremioPresetDefinition[] = [
  {
    value: "torrentio",
    manifestUrl: "https://torrentio.strem.fun/manifest.json",
    label: "Torrentio",
    image: "https://torrentio.strem.fun/images/logo_v1.png",
    description: "The gold standard, movies & series",
  },
  {
    value: "comet",
    manifestUrl: "https://comet.elfhosted.com/manifest.json",
    label: "Comet",
    emoji: "\u2604\uFE0F",
    description: "Ultra-fast lightweight scraper",
  },
  {
    value: "mediafusion",
    manifestUrl: "https://mediafusion.elfhosted.com/manifest.json",
    label: "MediaFusion",
    emoji: "\u{1F988}",
    description: "Great for movies, live TV & anime",
  },
];

export const STREMIO_PRESET_NAMES = STREMIO_PRESET_DEFINITIONS.map((preset) => preset.value) as [
  StremioPresetName,
  ...StremioPresetName[],
];

export const STREMIO_PRESETS: Record<StremioPresetName, string> = Object.fromEntries(
  STREMIO_PRESET_DEFINITIONS.map((preset) => [preset.value, preset.manifestUrl]),
) as Record<StremioPresetName, string>;
