import type { CreateModuleInput, ModuleCategory } from "@seedarr/contracts";
import type { Module } from "@seedarr/sdk";
import { getCatalogEntryForPreset, MODULE_CATALOG, type ModuleCatalogEntry } from "@seedarr/shared";

export type ModuleListFilter = "all" | ModuleCategory;

export type ModuleListItem = {
  key: string;
  catalog: ModuleCatalogEntry;
  installed: Module | null;
};

function sortRank(item: ModuleListItem): number {
  if (item.installed) return 0;
  if (item.catalog.comingSoon) return 2;
  return 1;
}

export function buildModuleListItems(installed: Module[]): ModuleListItem[] {
  const usedIds = new Set<string>();

  const items: ModuleListItem[] = MODULE_CATALOG.map((catalog) => {
    const match = installed.find((mod) => {
      if (usedIds.has(mod.id)) return false;
      if (mod.type !== catalog.type) return false;
      if (catalog.preset) {
        return mod.config.preset === catalog.preset;
      }
      if (catalog.type === "stremio") {
        return !mod.config.preset;
      }
      return true;
    });
    if (match) usedIds.add(match.id);
    return {
      key: catalog.preset ? `preset:${catalog.preset}` : `type:${catalog.type}`,
      catalog,
      installed: match ?? null,
    };
  });

  for (const mod of installed) {
    if (usedIds.has(mod.id)) continue;
    if (mod.type === "stremio") {
      const preset = mod.config.preset as "torrentio" | "comet" | "mediafusion" | undefined;
      const catalog = preset
        ? getCatalogEntryForPreset(preset)
        : {
            type: "stremio" as const,
            category: "indexer" as const,
            label: mod.label,
            description: mod.description,
            tags: mod.tags?.length ? mod.tags : ["Custom"],
            unique: false,
            logo: mod.logo ?? "/modules/stremio.svg",
          };
      usedIds.add(mod.id);
      items.push({ key: `installed:${mod.id}`, catalog, installed: mod });
      continue;
    }
    usedIds.add(mod.id);
    items.push({
      key: `installed:${mod.id}`,
      catalog: {
        type: mod.type,
        category: mod.category,
        label: mod.label,
        description: mod.description,
        tags: mod.tags ?? [],
        unique: true,
        logo: mod.logo ?? undefined,
        locked: mod.locked,
        comingSoon: mod.comingSoon,
        recommended: mod.recommended,
      },
      installed: mod,
    });
  }

  return items.sort((a, b) => sortRank(a) - sortRank(b));
}

export function filterModuleListItems(
  items: ModuleListItem[],
  filter: ModuleListFilter,
  search: string,
): ModuleListItem[] {
  const q = search.trim().toLowerCase();
  return items.filter((item) => {
    if (filter !== "all" && item.catalog.category !== filter) return false;
    if (!q) return true;
    const hay = [
      item.catalog.label,
      item.catalog.description,
      item.catalog.type,
      item.catalog.category,
      ...(item.catalog.tags ?? []),
      item.installed?.label,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function buildCreatePayload(catalog: ModuleCatalogEntry): CreateModuleInput | null {
  if (catalog.comingSoon) return null;
  if (catalog.preset) {
    return { type: "stremio", config: { preset: catalog.preset } };
  }
  switch (catalog.type) {
    case "tmdb":
      return { type: "tmdb", config: {} };
    case "letterboxd":
      return { type: "letterboxd", config: {} };
    case "jackett":
      return { type: "jackett", config: { url: "http://localhost:9117", apiKey: "changeme" } };
    case "prowlarr":
      return { type: "prowlarr", config: { url: "http://localhost:9696", apiKey: "changeme" } };
    case "webdav":
      return {
        type: "webdav",
        config: { host: "", port: 443, secure: true, autoTransfer: false, deleteLocalAfterTransfer: false },
      };
    case "ftp":
      return {
        type: "ftp",
        config: { host: "", port: 21, secure: false, autoTransfer: false, deleteLocalAfterTransfer: false },
      };
    case "stremio":
      return null;
    default:
      return null;
  }
}

export function moduleDisplayLogo(item: ModuleListItem): string {
  if (item.installed?.logo) return item.installed.logo;
  if (item.catalog.logo) return item.catalog.logo;
  return "/modules/stremio.svg";
}

export function moduleDisplayTitle(item: ModuleListItem): string {
  return item.installed?.label ?? item.catalog.label;
}

export function moduleDisplayDescription(item: ModuleListItem): string {
  return item.installed?.description ?? item.catalog.description;
}

export function moduleDisplayTags(item: ModuleListItem): string[] {
  return item.installed?.tags?.length ? item.installed.tags : item.catalog.tags;
}
