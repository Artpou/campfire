import { useCallback, useMemo, useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { Module } from "@seedarr/sdk";
import { formatError } from "@seedarr/shared";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_text,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { SettingsIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { SentinelStuck, StickyFilterBar } from "@/shared/components/sentinel/sentinel-stuck";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DataTable } from "@/shared/ui/data-table";
import { Img } from "@/shared/ui/image";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { TooltipWrapper } from "@/shared/ui/tooltip-wrapper";

import { ModuleStatusBadge } from "@/features/module/components/module-status-badge";
import { ModuleTabsFilter } from "@/features/module/components/module-tabs-filter";
import {
  buildCreatePayload,
  buildModuleListItems,
  filterModuleListItems,
  type ModuleListFilter,
  type ModuleListItem,
  moduleDisplayDescription,
  moduleDisplayLogo,
  moduleDisplayTags,
  moduleDisplayTitle,
} from "@/features/module/helpers/module-list.helper";
import { moduleQueries, useCreateModule, useUpdateModule } from "@/features/module/hooks/module.queries";

const modulesTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { text: sortFn_text },
});

type ModulesTableFeatures = typeof modulesTableFeatures;
const columnHelper = createColumnHelper<ModulesTableFeatures, ModuleListItem>();

function ModuleStatusCell({ mod }: { mod: Module | null }) {
  if (!mod) return <span className="text-muted-foreground">—</span>;
  return <ModuleStatusBadge mod={mod} />;
}

function ModuleInfoBadges({ item }: { item: ModuleListItem }) {
  const tags = moduleDisplayTags(item);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {(item.catalog.recommended || item.installed?.recommended) && (
        <Badge variant="default" className="shrink-0 text-[10px] gap-1">
          <SparklesIcon className="size-3" />
          <Trans>Recommended</Trans>
        </Badge>
      )}
      <Badge variant="glass" className="capitalize text-[10px]">
        {item.catalog.category}
      </Badge>
      {tags.map((tag) => (
        <Badge key={tag} variant="outline" className="text-[10px]">
          {tag}
        </Badge>
      ))}
    </div>
  );
}

interface SettingsModulesProps {
  filter: ModuleListFilter;
  search: string;
  onFilterChange: (filter: ModuleListFilter) => void;
  onSearchChange: (search: string) => void;
}

export function SettingsModules({ filter, search, onFilterChange, onSearchChange }: SettingsModulesProps) {
  const { t } = useLingui();
  const navigate = useNavigate();
  const [isStuck, setIsStuck] = useState(false);
  const { data: modules = [] } = useQuery(moduleQueries.list());
  const createMutation = useCreateModule();
  const updateMutation = useUpdateModule();

  const items = useMemo(
    () => filterModuleListItems(buildModuleListItems(modules), filter, search),
    [modules, filter, search],
  );

  const install = useCallback(
    (item: ModuleListItem) => {
      if (item.catalog.type === "stremio" && !item.catalog.preset) {
        navigate({ to: "/settings/modules/new", search: { type: "stremio" } });
        return;
      }
      const payload = buildCreatePayload(item.catalog);
      if (!payload) return;
      createMutation.mutate(payload, {
        onSuccess: (created) => {
          if (created.configRequired) {
            navigate({ to: "/settings/modules/$id", params: { id: created.id } });
          }
        },
      });
    },
    [createMutation, navigate],
  );

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.display({
          id: "info",
          header: () => <Trans>Module</Trans>,
          cell: ({ row }) => {
            const item = row.original;
            const title = moduleDisplayTitle(item);
            const description = moduleDisplayDescription(item);
            return (
              <div className="flex items-start gap-3 min-w-0 py-1">
                <Img
                  src={moduleDisplayLogo(item)}
                  alt={title}
                  className="size-14 md:size-16 rounded-lg object-cover shrink-0 bg-transparent"
                />
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="font-semibold text-sm md:text-base truncate">{title}</p>
                  </div>
                  <ModuleInfoBadges item={item} />
                  <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
                </div>
              </div>
            );
          },
        }),
        columnHelper.display({
          id: "status",
          meta: { headerClassName: "w-40", cellClassName: "w-40" },
          header: () => <Trans>Status</Trans>,
          cell: ({ row }) => <ModuleStatusCell mod={row.original.installed} />,
        }),
        columnHelper.display({
          id: "actions",
          meta: { headerClassName: "w-44", cellClassName: "w-44 text-right" },
          header: () => null,
          cell: ({ row }) => {
            const item = row.original;
            const mod = item.installed;

            if (item.catalog.comingSoon) {
              return (
                <div className="flex justify-end">
                  <Badge variant="outline">
                    <Trans>Coming soon</Trans>
                  </Badge>
                </div>
              );
            }

            if (!mod) {
              return (
                <div className="flex justify-end">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      install(item);
                    }}
                    disabled={createMutation.isPending}
                  >
                    <Trans>Install</Trans>
                  </Button>
                </div>
              );
            }

            return (
              <div className="flex items-center justify-end gap-2">
                <TooltipWrapper tooltip={<Trans>Configure</Trans>}>
                  <Button
                    variant="secondary"
                    size="icon-sm"
                    icon={SettingsIcon}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate({ to: "/settings/modules/$id", params: { id: mod.id } });
                    }}
                    aria-label={t(msg`Configure`)}
                  />
                </TooltipWrapper>
                {!mod.locked && (
                  <Switch
                    checked={mod.enabled}
                    disabled={updateMutation.isPending}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={(enabled) =>
                      updateMutation.mutate(
                        { id: mod.id, enabled },
                        {
                          onError: (error) =>
                            toast.error(t(msg`Could not update module`), { description: formatError(error) }),
                        },
                      )
                    }
                  />
                )}
              </div>
            );
          },
        }),
      ]),
    [createMutation.isPending, updateMutation, t, install, navigate],
  );

  const table = useTable({
    features: modulesTableFeatures,
    data: items,
    columns,
    getRowId: (row) => row.key,
  });

  return (
    <section className="space-y-4">
      <SentinelStuck setIsStuck={setIsStuck} marginTop={-30} />
      <StickyFilterBar isStuck={isStuck}>
        <div className="flex items-center justify-between gap-2">
          <ModuleTabsFilter value={filter} onChange={onFilterChange} className="flex-1" />
        </div>
      </StickyFilterBar>

      {!isStuck && (
        <Input
          placeholder={t(msg`Search modules…`)}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          search
        />
      )}

      <DataTable
        classNameContainer="px-2"
        table={table}
        empty={<Trans>No modules found</Trans>}
        onRowClick={(row) => {
          if (row.original.installed) {
            navigate({ to: "/settings/modules/$id", params: { id: row.original.installed.id } });
          }
        }}
      />
    </section>
  );
}
