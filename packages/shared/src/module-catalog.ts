export type ModuleCategory = "system" | "indexer" | "social" | "storage" | "notification";

export type ModuleType =
  | "tmdb"
  | "subdl"
  | "jackett"
  | "prowlarr"
  | "stremio"
  | "letterboxd"
  | "trakt"
  | "webdav"
  | "ftp"
  | "smb"
  | "discord"
  | "telegram"
  | "email";

export type ModuleCatalogEntry = {
  type: ModuleType;
  category: ModuleCategory;
  label: string;
  description: string;
  /** Short tags shown under the title (category is separate). */
  tags: string[];
  /** Only one instance allowed (except stremio). */
  unique: boolean;
  /** Locked system module — cannot delete / disable. */
  locked?: boolean;
  /** Shown in catalog but not installable yet. */
  comingSoon?: boolean;
  recommended?: boolean;
  logo?: string;
  /** Stremio preset key when this catalog row maps to a preset install. */
  preset?: "torrentio" | "comet" | "mediafusion";
};

export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  {
    type: "tmdb",
    category: "system",
    label: "The Movie Database",
    description: "Browse movies and TV shows with rich metadata from TMDB.",
    tags: ["Metadata"],
    unique: true,
    locked: true,
    logo: "/modules/tmdb.png",
  },
  {
    type: "subdl",
    category: "system",
    label: "SUBDL",
    description: "Search and download subtitles for movies and TV shows.",
    tags: ["Subtitles"],
    unique: true,
    locked: true,
    logo: "/modules/subdl.webp",
  },
  {
    type: "stremio",
    category: "indexer",
    label: "Torrentio",
    description: "The gold standard torrent addon for movies and series.",
    tags: [],
    unique: false,
    recommended: true,
    logo: "/modules/torrentio.png",
    preset: "torrentio",
  },
  {
    type: "jackett",
    category: "indexer",
    label: "Jackett",
    description: "Self-hosted proxy that translates tracker APIs into a common format.",
    tags: ["Self-hosted"],
    unique: true,
    logo: "/modules/jackett.png",
  },
  {
    type: "prowlarr",
    category: "indexer",
    label: "Prowlarr",
    description: "Self-hosted indexer manager that syncs with *arr apps.",
    tags: ["Self-hosted"],
    unique: true,
    logo: "/modules/prowlarr.png",
  },
  {
    type: "stremio",
    category: "indexer",
    label: "Custom Stremio addon",
    description: "Install any Stremio torrent addon from a manifest URL.",
    tags: ["Custom"],
    unique: false,
    logo: "/modules/stremio.png",
  },
  {
    type: "letterboxd",
    category: "social",
    label: "Letterboxd",
    description: "Import your Letterboxd watchlist and film ratings.",
    tags: ["Movies"],
    unique: true,
    logo: "/modules/letterboxd.png",
  },
  {
    type: "trakt",
    category: "social",
    label: "Trakt",
    description: "Sync watch history and progress with your Trakt account.",
    tags: [],
    unique: true,
    comingSoon: true,
    logo: "/modules/trakt.png",
  },
  {
    type: "webdav",
    category: "storage",
    label: "WebDAV",
    description: "Store completed downloads on a remote WebDAV server.",
    tags: [],
    unique: true,
    logo: "/modules/webdav.svg",
  },
  {
    type: "ftp",
    category: "storage",
    label: "FTP / FTPS",
    description: "Transfer completed downloads to a remote FTP server.",
    tags: [],
    unique: true,
    logo: "/modules/ftp.svg",
  },
  {
    type: "smb",
    category: "storage",
    label: "SMB / Synology",
    description: "Mount a network share for remote media storage.",
    tags: [],
    unique: true,
    comingSoon: true,
    logo: "/modules/smb.svg",
  },
  {
    type: "discord",
    category: "notification",
    label: "Discord",
    description: "Send download and request notifications to a Discord webhook.",
    tags: [],
    unique: true,
    comingSoon: true,
    logo: "/modules/discord.webp",
  },
  {
    type: "telegram",
    category: "notification",
    label: "Telegram",
    description: "Receive Seedarr alerts through a Telegram bot.",
    tags: [],
    unique: true,
    comingSoon: true,
    logo: "/modules/telegram.svg",
  },
  {
    type: "email",
    category: "notification",
    label: "Email (SMTP)",
    description: "Email notifications via your SMTP server.",
    tags: [],
    unique: true,
    comingSoon: true,
    logo: "/modules/email.svg",
  },
];

const LEGACY_PRESET_LABELS: Record<"comet" | "mediafusion", string> = {
  comet: "Comet",
  mediafusion: "MediaFusion",
};

export function getModuleCatalogEntry(type: ModuleType): ModuleCatalogEntry {
  const entry = MODULE_CATALOG.find((m) => m.type === type && !m.preset);
  if (entry) return entry;
  const any = MODULE_CATALOG.find((m) => m.type === type);
  if (!any) throw new Error(`Unknown module type: ${type}`);
  return any;
}

export function categoryForModuleType(type: ModuleType): ModuleCategory {
  return getModuleCatalogEntry(type).category;
}

export function getCatalogEntryForPreset(preset: "torrentio" | "comet" | "mediafusion"): ModuleCatalogEntry {
  const entry = MODULE_CATALOG.find((m) => m.preset === preset);
  if (entry) return entry;
  if (preset === "comet" || preset === "mediafusion") {
    return {
      type: "stremio",
      category: "indexer",
      label: LEGACY_PRESET_LABELS[preset],
      description: "Stremio torrent addon",
      tags: [],
      unique: false,
      logo: `/modules/${preset}.svg`,
      preset,
    };
  }
  throw new Error(`Unknown preset: ${preset}`);
}
