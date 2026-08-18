import { useCallback, useMemo, useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { useNavigate } from "@tanstack/react-router";
import { type OnChangeFn, type RowSelectionState, type SortingState, useTable } from "@tanstack/react-table";
import { Trash2Icon } from "lucide-react";

import { InfiniteSentinel } from "@/shared/components/infinite-sentinel";
import { flattenInfiniteResults, type InfiniteResultsQuery } from "@/shared/hooks/use-infinite-list";
import { Button } from "@/shared/ui/button";
import { DataTable } from "@/shared/ui/data-table";

import { useAuth } from "@/features/auth/auth-store";
import { useRole } from "@/features/auth/hooks/use-role";
import { DownloadModalDelete } from "@/features/downloads/components/download-modal-delete";
import { useBatchDeleteDownloads } from "@/features/downloads/hooks/download.queries";
import {
  downloadTableFeatures,
  type MediaWithDownload,
  useDownloadTableColumns,
} from "@/features/downloads/hooks/use-download-table-columns";

interface DownloadTableProps {
  media?: Media[];
  query?: InfiniteResultsQuery<Media>;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
}

export function DownloadTable({ media, query, sorting, onSortingChange }: DownloadTableProps) {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const currentUser = useAuth((s) => s.user);
  const batchDelete = useBatchDeleteDownloads();

  const [localSorting, setLocalSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const items = useMemo(
    () => (media ?? flattenInfiniteResults(query)).filter((m): m is MediaWithDownload => Boolean(m.download)),
    [media, query],
  );
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

      <InfiniteSentinel query={query} />

      <DownloadModalDelete
        open={deleteDialogOpen}
        setOpen={setDeleteDialogOpen}
        showLibraryOnly
        pending={batchDelete.isPending}
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
        onConfirm={(libraryOnly) => {
          batchDelete.mutate(
            { ids: selectedIds, dbOnly: libraryOnly },
            {
              onSuccess: () => {
                setRowSelection({});
                setDeleteDialogOpen(false);
              },
            },
          );
        }}
      />
    </div>
  );
}
