import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { useNavigate } from "@tanstack/react-router";
import { type OnChangeFn, type RowSelectionState, type SortingState, useTable } from "@tanstack/react-table";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { Trash2Icon } from "lucide-react";

import { DialogDelete } from "@/shared/components/dialog/dialog-delete";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { DataTable } from "@/shared/ui/data-table";
import { Label } from "@/shared/ui/label";

import { useAuth } from "@/features/auth/auth-store";
import { useRole } from "@/features/auth/hooks/use-role";
import { useBatchDeleteDownloads } from "@/features/downloads/hooks/download.queries";
import {
  downloadTableFeatures,
  type MediaWithDownload,
  useDownloadTableColumns,
} from "@/features/downloads/hooks/use-download-table-columns";

interface DownloadTableProps {
  media: Media[];
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
}

export function DownloadTable({ media, onLoadMore, isLoadingMore, sorting, onSortingChange }: DownloadTableProps) {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const currentUser = useAuth((s) => s.user);
  const batchDelete = useBatchDeleteDownloads();

  const [localSorting, setLocalSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dbOnly, setDbOnly] = useState(false);

  const items = useMemo(() => media.filter((m): m is MediaWithDownload => Boolean(m.download)), [media]);
  const resolvedSorting = sorting ?? localSorting;
  const resolvedOnSortingChange = onSortingChange ?? setLocalSorting;
  const manualSorting = Boolean(onSortingChange);

  const canDelete = useCallback(
    (download: MediaWithDownload["download"]) => isAdmin || download.userId === currentUser?.id,
    [isAdmin, currentUser?.id],
  );

  const onDelete = useCallback((rowId: string) => {
    setRowSelection({ [rowId]: true });
    setDeleteDialogOpen(true);
  }, []);

  const columns = useDownloadTableColumns({ canDelete, onDelete });

  const [sentinelRef, entry] = useIntersectionObserver({ threshold: 1 });
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (entry?.isIntersecting && !isLoadingMore && onLoadMoreRef.current) {
      onLoadMoreRef.current();
    }
  }, [entry?.isIntersecting, isLoadingMore]);

  const table = useTable({
    features: downloadTableFeatures,
    data: items,
    columns,
    getRowId: (row) => row.download.id,
    manualSorting,
    onSortingChange: resolvedOnSortingChange,
    onRowSelectionChange: setRowSelection,
    state: { sorting: resolvedSorting, rowSelection },
  });

  const selectedIds = table.getFilteredSelectedRowModel().rows.map((r) => r.original.download.id);
  const someSelected = selectedIds.length > 0;

  const handleBatchDelete = () => {
    batchDelete.mutate(
      { ids: selectedIds, dbOnly },
      {
        onSuccess: () => {
          setRowSelection({});
          setDeleteDialogOpen(false);
          setDbOnly(false);
        },
      },
    );
  };

  return (
    <div className="space-y-2">
      {someSelected && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2 mb-2">
          <span className="text-sm font-medium">
            {selectedIds.length} <Trans>selected</Trans>
          </span>
          <Button variant="destructive" size="sm" icon={Trash2Icon} onClick={() => setDeleteDialogOpen(true)}>
            <Trans>Delete</Trans>
          </Button>
        </div>
      )}

      <DataTable
        table={table}
        empty={<Trans>No downloads</Trans>}
        onRowClick={(row) => navigate({ to: "/downloads/$id", params: { id: row.original.download.id } })}
      />

      {onLoadMore && <div ref={sentinelRef} className="h-4" aria-hidden />}

      <DialogDelete
        open={deleteDialogOpen}
        setOpen={setDeleteDialogOpen}
        validate={handleBatchDelete}
        disabled={batchDelete.isPending}
        title={
          selectedIds.length > 1 ? <Trans>Delete {selectedIds.length} downloads</Trans> : <Trans>Delete Download</Trans>
        }
        description={
          selectedIds.length > 1 ? (
            <Trans>
              Are you sure you want to delete these {selectedIds.length} downloads? This action cannot be undone.
            </Trans>
          ) : (
            <Trans>Are you sure you want to delete this download? This action cannot be undone.</Trans>
          )
        }
        extra={
          <div className="flex items-center gap-2 py-2">
            <Checkbox
              id="db-only-batch"
              checked={dbOnly}
              onCheckedChange={(v: boolean | "indeterminate") => setDbOnly(v === true)}
            />
            <Label htmlFor="db-only-batch" className="text-sm cursor-pointer">
              <Trans>Remove from library only (keep files on disk)</Trans>
            </Label>
          </div>
        }
      />
    </div>
  );
}
