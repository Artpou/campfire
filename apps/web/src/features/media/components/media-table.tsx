import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { useNavigate } from "@tanstack/react-router";
import { type OnChangeFn, type SortingState, useTable } from "@tanstack/react-table";

import { InfiniteSentinel } from "@/shared/components/infinite-sentinel";
import { flattenInfiniteResults, type InfiniteResultsQuery } from "@/shared/hooks/use-infinite-list";
import { DataTable } from "@/shared/ui/data-table";

import { mediaTableFeatures, useMediaTableColumns } from "@/features/media/hooks/use-media-table-columns";

interface MediaTableProps {
  media?: Media[];
  query?: InfiniteResultsQuery<Media>;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
}

export function MediaTable({ media, query, sorting, onSortingChange }: MediaTableProps) {
  const navigate = useNavigate();
  const [localSorting, setLocalSorting] = useState<SortingState>([]);
  const columns = useMediaTableColumns();
  const items = media ?? flattenInfiniteResults(query);
  const resolvedSorting = sorting ?? localSorting;
  const resolvedOnSortingChange = onSortingChange ?? setLocalSorting;
  const manualSorting = Boolean(onSortingChange);

  const table = useTable({
    features: mediaTableFeatures,
    data: items,
    columns,
    getRowId: (row) => `${row.type}-${row.id}`,
    manualSorting,
    onSortingChange: resolvedOnSortingChange,
    state: { sorting: resolvedSorting },
  });

  return (
    <div className="space-y-2">
      <DataTable
        table={table}
        empty={<Trans>Nothing here yet</Trans>}
        onRowClick={(row) => {
          const m = row.original;
          navigate({
            to: m.type === "tv" ? "/tv/$id" : "/movies/$id",
            params: { id: m.id.toString() },
          });
        }}
      />
      <InfiniteSentinel query={query} />
    </div>
  );
}
