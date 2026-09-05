import { useCallback, useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { ActivityCategory, ActivityType } from "@seedarr/contracts";
import type { Activity } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { useTable } from "@tanstack/react-table";
import { useDebounce } from "@uidotdev/usehooks";
import { DownloadIcon, LayoutGridIcon, type LucideIcon, MoreHorizontalIcon, PuzzleIcon, UserIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { EmptyState } from "@/shared/components/empty-state";
import { ResponsiveTabs } from "@/shared/components/responsive-tabs";
import { Select } from "@/shared/components/select/select";
import { SentinelStuck, StickyFilterBar } from "@/shared/components/sentinel/sentinel-stuck";
import { usePagedState } from "@/shared/hooks/use-paged-state";
import { DataTable } from "@/shared/ui/data-table";
import { DataTablePagination } from "@/shared/ui/data-table-pagination";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/ui/sheet";

import { SettingsActivityBadgeType } from "@/features/settings/components/badge/settings-activity-badge-type";
import { formatActivityAction, parseActivityMetadata } from "@/features/settings/helpers/activity.helper";
import { activityQueries } from "@/features/settings/hooks/activity.queries";
import { activityTableFeatures, useActivityColumns } from "@/features/settings/hooks/use-activity-columns";
import { UserProfile } from "@/features/user/components/user-profile";

type ActivityCategoryFilter = "all" | ActivityCategory;
type ActivityTypeFilter = "all" | ActivityType;

const PAGE_SIZE = 20;

const CATEGORY_FILTERS: { id: ActivityCategoryFilter; label: React.ReactNode; icon: LucideIcon }[] = [
  { id: "all", label: <Trans>All</Trans>, icon: LayoutGridIcon },
  { id: "user", label: <Trans>User</Trans>, icon: UserIcon },
  { id: "download", label: <Trans>Download</Trans>, icon: DownloadIcon },
  { id: "module", label: <Trans>Module</Trans>, icon: PuzzleIcon },
  { id: "others", label: <Trans>Others</Trans>, icon: MoreHorizontalIcon },
];

const TYPE_FILTERS: { value: ActivityTypeFilter; label: React.ReactNode }[] = [
  { value: "all", label: <Trans>All types</Trans> },
  { value: "SUCCESS", label: <Trans>Success</Trans> },
  { value: "WARNING", label: <Trans>Warning</Trans> },
  { value: "ERROR", label: <Trans>Error</Trans> },
];

export function SettingsActivityView() {
  const { t } = useLingui();
  const [selectedLog, setSelectedLog] = useState<Activity | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategoryFilter>("all");
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>("all");
  const [query, setQuery] = useState("");
  const [isStuck, setIsStuck] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const filters = {
    q: debouncedQuery.trim() || undefined,
    category: categoryFilter,
    type: typeFilter,
  };
  const { page, setPage } = usePagedState(filters);

  const {
    data: logs,
    isError,
    refetch,
  } = useQuery(
    activityQueries.list({
      page,
      limit: PAGE_SIZE,
      type: typeFilter === "all" ? undefined : typeFilter,
      category: categoryFilter === "all" ? undefined : categoryFilter,
      q: filters.q,
    }),
  );

  const results = logs?.results ?? [];
  const total = logs?.total ?? results.length;
  const parsedMetadata = selectedLog ? parseActivityMetadata(selectedLog.metadata) : null;
  const onDetail = useCallback((log: Activity) => setSelectedLog(log), []);
  const columns = useActivityColumns({ onDetail });

  const table = useTable({
    features: activityTableFeatures,
    data: results,
    columns,
    getRowId: (row) => row.id,
  });

  const searchInput = (
    <Input
      type="search"
      search
      placeholder={t(msg`Search activity…`)}
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      classNameWrapper="w-full"
      h="lg"
    />
  );

  return (
    <div className="space-y-4">
      <SentinelStuck setIsStuck={setIsStuck} />
      {!isStuck && searchInput}
      <StickyFilterBar isStuck={isStuck}>
        {isStuck ? (
          <div className="flex w-full items-center gap-2">{searchInput}</div>
        ) : (
          <div className="flex w-full items-center justify-between gap-2">
            <ResponsiveTabs
              className="w-full"
              value={categoryFilter}
              onValueChange={(v) => setCategoryFilter(v as ActivityCategoryFilter)}
              options={CATEGORY_FILTERS.map((f) => ({ value: f.id, label: f.label, icon: f.icon }))}
            />
            <Select
              value={typeFilter}
              onValueChange={setTypeFilter}
              options={TYPE_FILTERS}
              triggerClassName="shrink-0 min-w-36 w-fit"
            />
          </div>
        )}
      </StickyFilterBar>

      <DataTablePagination page={page} limit={PAGE_SIZE} total={total} onPageChange={setPage} />

      <DataTable
        table={table}
        empty={
          isError ? (
            <EmptyState
              title={<Trans>Could not load activity</Trans>}
              subtitle={<Trans>Check your connection and try again.</Trans>}
              action={
                <button type="button" className="text-sm underline" onClick={() => refetch()}>
                  <Trans>Retry</Trans>
                </button>
              }
            />
          ) : (
            <EmptyState
              title={<Trans>No activity yet</Trans>}
              subtitle={<Trans>Actions from the household will show up here.</Trans>}
            />
          )
        }
      />

      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          {selectedLog && (
            <>
              <SheetHeader>
                <SheetTitle className="capitalize">{formatActivityAction(selectedLog.action)}</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    <Trans>Type</Trans>
                  </p>
                  <SettingsActivityBadgeType type={selectedLog.type} />
                </div>
                {selectedLog.user ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      <Trans>User</Trans>
                    </p>
                    <UserProfile user={selectedLog.user} size="sm" />
                  </div>
                ) : selectedLog.userId ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      <Trans>User ID</Trans>
                    </p>
                    <p className="text-sm font-mono text-muted-foreground">{selectedLog.userId}</p>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    <Trans>Date</Trans>
                  </p>
                  <p className="text-sm text-muted-foreground">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                </div>
                {parsedMetadata && (
                  <div className="space-y-2">
                    <Label className={cn("text-xs font-semibold uppercase text-muted-foreground")}>
                      <Trans>Metadata</Trans>
                    </Label>
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                      {JSON.stringify(parsedMetadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
