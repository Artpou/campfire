import { useEffect, useMemo, useRef, useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { useNavigate } from "@tanstack/react-router";
import { type SortingState, useTable } from "@tanstack/react-table";
import { useIntersectionObserver } from "@uidotdev/usehooks";

import { DataTable } from "@/shared/ui/data-table";

import { mediaTableFeatures, useMediaTableColumns } from "@/features/media/hooks/use-media-table-columns";

interface MediaTableProps {
  media: Media[];
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

export function MediaTable({ media, onLoadMore, isLoadingMore }: MediaTableProps) {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = useMediaTableColumns();
  const items = useMemo(() => media, [media]);

  const [sentinelRef, entry] = useIntersectionObserver({ threshold: 1 });
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (entry?.isIntersecting && !isLoadingMore && onLoadMoreRef.current) {
      onLoadMoreRef.current();
    }
  }, [entry?.isIntersecting, isLoadingMore]);

  const table = useTable({
    features: mediaTableFeatures,
    data: items,
    columns,
    getRowId: (row) => `${row.type}-${row.id}`,
    onSortingChange: setSorting,
    state: { sorting },
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
      {onLoadMore && <div ref={sentinelRef} className="h-4" aria-hidden />}
    </div>
  );
}
