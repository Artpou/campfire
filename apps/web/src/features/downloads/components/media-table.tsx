import { useCallback, useMemo, useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { useNavigate } from "@tanstack/react-router";
import { type RowSelectionState, type SortingState, useTable } from "@tanstack/react-table";
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
  type MediaWithDownload,
  mediaTableFeatures,
  useMediaTableColumns,
} from "@/features/downloads/hooks/use-media-table-columns";

interface MediaTableProps {
  media: Media[];
}

export function MediaTable({ media }: MediaTableProps) {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const currentUser = useAuth((s) => s.user);
  const batchDelete = useBatchDeleteDownloads();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dbOnly, setDbOnly] = useState(false);

  const items = useMemo(() => media.filter((m): m is MediaWithDownload => Boolean(m.download)), [media]);

  const canDelete = useCallback(
    (download: MediaWithDownload["download"]) => isAdmin || download.userId === currentUser?.id,
    [isAdmin, currentUser?.id],
  );

  const onPlay = useCallback(
    (downloadId: string) => {
      navigate({ to: "/downloads/$id/play", params: { id: downloadId } });
    },
    [navigate],
  );

  const onDelete = useCallback((rowId: string) => {
    setRowSelection({ [rowId]: true });
    setDeleteDialogOpen(true);
  }, []);

  const columns = useMediaTableColumns({ canDelete, onPlay, onDelete });

  const table = useTable({
    features: mediaTableFeatures,
    data: items,
    columns,
    getRowId: (row) => row.download.id,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: { sorting, rowSelection },
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
    <>
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
    </>
  );
}
