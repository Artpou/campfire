import { useMemo } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { Download, Media } from "@seedarr/sdk";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table";
import { HardDriveIcon, PlayIcon, ServerIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { DataTableColumnHeader } from "@/shared/ui/data-table-column-header";
import { TooltipWrapper } from "@/shared/ui/tooltip-wrapper";

import { DownloadMetadata } from "@/features/downloads/components/download-metadata";
import { DownloadProgress } from "@/features/downloads/components/download-progress";
import { getDownloadStatus } from "@/features/downloads/helpers/downloads.helper";
import { MediaTypeBadge } from "@/features/media/components/media-type-badge";
import { getPosterUrl } from "@/features/media/helpers/media.helper";

export type MediaWithDownload = Media & { download: Download };

export const downloadTableFeatures = tableFeatures({
  rowSortingFeature,
  rowSelectionFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});

type DownloadTableFeatures = typeof downloadTableFeatures;

const columnHelper = createColumnHelper<DownloadTableFeatures, MediaWithDownload>();

interface UseDownloadTableColumnsOptions {
  canDelete: (download: Download) => boolean;
  onPlay: (downloadId: string) => void;
  onDelete: (rowId: string) => void;
}

export function useDownloadTableColumns({ canDelete, onPlay, onDelete }: UseDownloadTableColumnsOptions) {
  const { t } = useLingui();

  return useMemo(
    () =>
      columnHelper.columns([
        columnHelper.display({
          id: "select",
          meta: { headerClassName: "w-10", cellClassName: "w-10" },
          header: ({ table }) => (
            <Checkbox
              checked={table.getIsAllPageRowsSelected()}
              onCheckedChange={(value: boolean | "indeterminate") => table.toggleAllPageRowsSelected(!!value)}
              aria-label={t`Select all`}
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value: boolean | "indeterminate") => row.toggleSelected(!!value)}
              aria-label={t`Select row`}
              onClick={(e) => e.stopPropagation()}
            />
          ),
          enableSorting: false,
        }),
        columnHelper.display({
          id: "poster",
          meta: { headerClassName: "w-10 md:w-14", cellClassName: "p-1 w-10 md:w-14" },
          cell: ({ row }) => (
            <img
              src={getPosterUrl(row.original.poster_path, "w92")}
              alt={row.original.title ?? ""}
              className="w-8 h-12 md:w-10 md:h-14 object-cover rounded"
            />
          ),
          enableSorting: false,
        }),
        columnHelper.accessor((row) => row.title || row.original_title || "", {
          id: "info",
          header: ({ column }) => <DataTableColumnHeader column={column} title={<Trans>Info</Trans>} />,
          cell: ({ row }) => {
            const m = row.original;
            const dl = m.download;
            const status = getDownloadStatus(dl);
            const isActive =
              status === "downloading" ||
              status === "queued" ||
              status === "paused" ||
              Boolean(dl.torrent?.transferring);
            const hasLocal = Boolean(dl.torrent);
            const hasRemote = Boolean(dl.remoteLocation);

            return (
              <div className="space-y-1 min-w-0">
                <p className="font-medium truncate text-sm md:text-base">{m.title || m.original_title}</p>
                {isActive ? (
                  <DownloadProgress download={dl} size="sm" />
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <MediaTypeBadge type={m.type} />
                    <DownloadMetadata download={dl} />
                    {hasLocal && (
                      <TooltipWrapper tooltip={<Trans>Local</Trans>}>
                        <span className="inline-flex">
                          <HardDriveIcon className="size-3.5 text-muted-foreground" />
                        </span>
                      </TooltipWrapper>
                    )}
                    {hasRemote && (
                      <TooltipWrapper tooltip={<Trans>Remote server</Trans>}>
                        <span className="inline-flex">
                          <ServerIcon className="size-3.5 text-muted-foreground" />
                        </span>
                      </TooltipWrapper>
                    )}
                  </div>
                )}
              </div>
            );
          },
          sortFn: "text",
        }),
        columnHelper.accessor((row) => (row.download.createdAt ? new Date(row.download.createdAt).getTime() : 0), {
          id: "date",
          meta: { headerClassName: "w-24 md:w-28", cellClassName: "w-24 md:w-28" },
          header: ({ column }) => <DataTableColumnHeader column={column} title={<Trans>Date</Trans>} />,
          cell: ({ row }) => {
            const createdAt = row.original.download.createdAt;
            return (
              <span className="text-xs md:text-sm text-popover-foreground whitespace-nowrap">
                {createdAt ? new Date(createdAt).toLocaleDateString() : "—"}
              </span>
            );
          },
        }),
        columnHelper.display({
          id: "actions",
          meta: { headerClassName: "w-24 md:w-28", cellClassName: "w-24 md:w-28" },
          cell: ({ row }) => {
            const dl = row.original.download;
            return (
              <div className="flex items-center justify-end gap-1.5">
                <Button
                  size="sm"
                  icon={PlayIcon}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(dl.id);
                  }}
                />
                {canDelete(dl) && (
                  <Button
                    variant="destructive"
                    size="sm"
                    icon={Trash2Icon}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(row.id);
                    }}
                  />
                )}
              </div>
            );
          },
          enableSorting: false,
        }),
      ]),
    [t, canDelete, onPlay, onDelete],
  );
}
