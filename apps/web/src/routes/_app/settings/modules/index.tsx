import { createFileRoute } from "@tanstack/react-router";

import { redirectIfNotRole } from "@/shared/helpers/role.helper";

import { parseModuleFilter } from "@/features/module/components/module-tabs-filter";
import { SettingsModulesTab } from "@/features/module/components/settings-modules-tab";
import type { ModuleListFilter } from "@/features/module/helpers/module-list.helper";

export type ModulesSearch = {
  tab?: Exclude<ModuleListFilter, "all">;
  q?: string;
};

export const Route = createFileRoute("/_app/settings/modules/")({
  beforeLoad: ({ context }) => redirectIfNotRole(context, "admin", { to: "/settings/general" }),
  validateSearch: (search: Record<string, unknown>): ModulesSearch => {
    const parsed = typeof search.tab === "string" ? parseModuleFilter(search.tab) : "all";
    return {
      tab: parsed === "all" ? undefined : (parsed as Exclude<ModuleListFilter, "all">),
      q: typeof search.q === "string" && search.q.length > 0 ? search.q : undefined,
    };
  },
  component: SettingsModulesPage,
});

function SettingsModulesPage() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const filter = search.tab ?? "all";
  const q = search.q ?? "";

  return (
    <SettingsModulesTab
      filter={filter}
      search={q}
      onFilterChange={(next) => navigate({ search: (prev) => ({ ...prev, tab: next === "all" ? undefined : next }) })}
      onSearchChange={(next) => navigate({ search: (prev) => ({ ...prev, q: next || undefined }), replace: true })}
    />
  );
}
