import { msg } from "@lingui/core/macro";
import type { ModuleCatalogEntry, ModuleType } from "@seedarr/shared";

type CatalogKey = ModuleType | `preset:${string}`;

function catalogKey(catalog: ModuleCatalogEntry): CatalogKey {
  return catalog.preset ? (`preset:${catalog.preset}` as CatalogKey) : catalog.type;
}

const CATALOG_LABEL_MSG: Record<string, ReturnType<typeof msg>> = {
  tmdb: msg({ id: "module.catalog.tmdb.label", message: "The Movie Database" }),
  subdl: msg({ id: "module.catalog.subdl.label", message: "SUBDL" }),
  "preset:torrentio": msg({ id: "module.catalog.torrentio.label", message: "Torrentio" }),
  jackett: msg({ id: "module.catalog.jackett.label", message: "Jackett" }),
  prowlarr: msg({ id: "module.catalog.prowlarr.label", message: "Prowlarr" }),
  stremio: msg({ id: "module.catalog.stremio-custom.label", message: "Custom Stremio addon" }),
  letterboxd: msg({ id: "module.catalog.letterboxd.label", message: "Letterboxd" }),
  trakt: msg({ id: "module.catalog.trakt.label", message: "Trakt" }),
  webdav: msg({ id: "module.catalog.webdav.label", message: "WebDAV" }),
  ftp: msg({ id: "module.catalog.ftp.label", message: "FTP / FTPS" }),
  smb: msg({ id: "module.catalog.smb.label", message: "SMB / Synology" }),
  discord: msg({ id: "module.catalog.discord.label", message: "Discord" }),
  telegram: msg({ id: "module.catalog.telegram.label", message: "Telegram" }),
  email: msg({ id: "module.catalog.email.label", message: "Email (SMTP)" }),
};

const CATALOG_DESCRIPTION_MSG: Record<string, ReturnType<typeof msg>> = {
  tmdb: msg({
    id: "module.catalog.tmdb.description",
    message: "Browse movies and TV shows with rich metadata from TMDB.",
  }),
  subdl: msg({
    id: "module.catalog.subdl.description",
    message: "Search and download subtitles for movies and TV shows.",
  }),
  "preset:torrentio": msg({
    id: "module.catalog.torrentio.description",
    message: "The gold standard torrent addon for movies and series.",
  }),
  jackett: msg({
    id: "module.catalog.jackett.description",
    message: "Self-hosted proxy that translates tracker APIs into a common format.",
  }),
  prowlarr: msg({
    id: "module.catalog.prowlarr.description",
    message: "Self-hosted indexer manager that syncs with *arr apps.",
  }),
  stremio: msg({
    id: "module.catalog.stremio-custom.description",
    message: "Install any Stremio torrent addon from a manifest URL.",
  }),
  letterboxd: msg({
    id: "module.catalog.letterboxd.description",
    message: "Import your Letterboxd watchlist and film ratings.",
  }),
  trakt: msg({
    id: "module.catalog.trakt.description",
    message: "Sync watch history and progress with your Trakt account.",
  }),
  webdav: msg({
    id: "module.catalog.webdav.description",
    message: "Store completed downloads on a remote WebDAV server.",
  }),
  ftp: msg({
    id: "module.catalog.ftp.description",
    message: "Transfer completed downloads to a remote FTP server.",
  }),
  smb: msg({
    id: "module.catalog.smb.description",
    message: "Mount a network share for remote media storage.",
  }),
  discord: msg({
    id: "module.catalog.discord.description",
    message: "Send download and request notifications to a Discord webhook.",
  }),
  telegram: msg({
    id: "module.catalog.telegram.description",
    message: "Receive Seedarr alerts through a Telegram bot.",
  }),
  email: msg({
    id: "module.catalog.email.description",
    message: "Email notifications via your SMTP server.",
  }),
};

export function catalogLabelMessage(catalog: ModuleCatalogEntry): ReturnType<typeof msg> | undefined {
  return CATALOG_LABEL_MSG[catalogKey(catalog)];
}

export function catalogDescriptionMessage(catalog: ModuleCatalogEntry): ReturnType<typeof msg> | undefined {
  return CATALOG_DESCRIPTION_MSG[catalogKey(catalog)];
}
