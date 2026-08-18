import type { ModuleCategory, ModuleType } from "@seedarr/contracts";
import type { Module } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";

import { moduleQueries } from "@/features/module/hooks/module.queries";

export type UseModuleResult = {
  module: Module | null;
  isInstalled: boolean;
  isEnabled: boolean;
  /** Installed, enabled, and not missing required config. */
  isAvailable: boolean;
  isLoading: boolean;
};

export function useModule(type: ModuleType): UseModuleResult {
  const { data: modules = [], isLoading } = useQuery(moduleQueries.list());
  const mod = modules.find((m) => m.type === type) ?? null;
  return {
    module: mod,
    isInstalled: Boolean(mod),
    isEnabled: Boolean(mod?.enabled),
    isAvailable: Boolean(mod?.enabled && !mod?.configRequired),
    isLoading,
  };
}

function useModules(category?: ModuleCategory) {
  const { data: modules = [], isLoading } = useQuery(moduleQueries.list());
  const filtered = category ? modules.filter((m) => m.category === category) : modules;
  return { modules: filtered, isLoading };
}

export function useIndexerModules() {
  const { data: indexers = [], isLoading } = useQuery({
    queryKey: ["modules", "indexers"] as const,
    queryFn: () => unwrap(api.modules.indexers.$get()),
  });
  const enabled = indexers.filter((indexer) => !indexer.disabled);
  return { indexers: enabled, hasIndexers: enabled.length > 0, isLoading };
}

export function useStorageModule() {
  const { modules, isLoading } = useModules("storage");
  const storage = modules.find((m) => m.enabled) ?? null;
  return {
    module: storage,
    isEnabled: Boolean(storage?.enabled && !storage.configRequired),
    isLoading,
  };
}
