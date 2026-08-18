import { useMemo } from "react";

import { plural } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import type { IndexerType } from "@seedarr/contracts";
import type { Media, Torrent } from "@seedarr/sdk";
import { getVideoContainer } from "@seedarr/shared";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpIcon, DownloadIcon, InfoIcon } from "lucide-react";

import { Flag } from "@/shared/components/flag";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DataTableColumnHeader } from "@/shared/ui/data-table-column-header";

import { indexersManagerImages } from "@/features/indexers-manager/helpers/indexers-manager.helper";

export interface TorrentWithMeta extends Torrent {
  indexerId?: string;
  indexerManagerType?: IndexerType;
  moduleId?: string;
}

export const torrentTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});

type TorrentTableFeatures = typeof torrentTableFeatures;

const columnHelper = createColumnHelper<TorrentTableFeatures, TorrentWithMeta>();

interface UseTorrentColumnsOptions {
  media: Media;
  count: number;
  onInspect: (torrent: TorrentWithMeta) => void;
  onDownload: (torrent: TorrentWithMeta) => void;
}

export function useTorrentColumns({ media, count, onInspect, onDownload }: UseTorrentColumnsOptions) {
  return useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("title", {
          id: "title",
          meta: { headerClassName: "w-full", cellClassName: "w-full max-w-0" },
          header: () => (
            <span className="flex items-center gap-2">
              <Badge variant="secondary">{count}</Badge>
              <Trans>{plural(count, { one: "Torrent", other: "Torrents" })}</Trans>
            </span>
          ),
          cell: ({ row }) => {
            const torrent = row.original;
            const container = getVideoContainer(torrent.title);

            return (
              <div className="flex flex-col gap-2 max-w-full">
                <a
                  href={torrent.detailsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full font-medium truncate text-popover-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  {torrent.title}
                </a>

                <div className="flex flex-wrap items-center gap-2">
                  <Flag lang={torrent.mediaInfos?.languages?.[0] || media.original_language || ""} />
                  {torrent.mediaInfos?.resolution && <Badge variant="secondary">{torrent.mediaInfos.resolution}</Badge>}
                  {container && <Badge variant="secondary">{container}</Badge>}
                  <Badge variant="outline">{torrent.tracker}</Badge>
                  {torrent.indexerManagerType && (
                    <img
                      src={indexersManagerImages[torrent.indexerManagerType]}
                      alt={torrent.indexerManagerType}
                      className="size-4"
                    />
                  )}
                </div>
              </div>
            );
          },
          sortFn: "text",
        }),
        columnHelper.accessor("size", {
          id: "size",
          meta: { headerClassName: "hidden sm:table-cell text-center", cellClassName: "hidden sm:table-cell" },
          header: ({ column }) => <DataTableColumnHeader column={column} title={<Trans>Size</Trans>} />,
          cell: ({ row }) => (
            <span className="font-medium text-muted-foreground">{(row.original.size / 1e9).toFixed(2)} GB</span>
          ),
        }),
        columnHelper.accessor("seeders", {
          id: "health",
          meta: {
            headerClassName: "hidden md:table-cell text-right",
            cellClassName: "hidden md:table-cell",
          },
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={<Trans>Health</Trans>} className="justify-end" />
          ),
          cell: ({ row }) => {
            const torrent = row.original;
            return (
              <div className="flex items-center justify-end gap-3">
                <div className="flex items-center gap-1 font-bold text-success">
                  <ArrowUpIcon className="size-3" />
                  <span className="text-xs">{torrent.seeders}</span>
                </div>
                {torrent.indexerManagerType !== "stremio" && (
                  <div className="flex items-center gap-1 font-bold text-destructive">
                    <ArrowDownIcon className="size-3" />
                    <span className="text-xs">{torrent.peers}</span>
                  </div>
                )}
              </div>
            );
          },
        }),
        columnHelper.display({
          id: "actions",
          meta: { headerClassName: "w-auto text-right", cellClassName: "text-right" },
          cell: ({ row }) => {
            const torrent = row.original;
            return (
              <div className="flex items-center justify-end gap-1.5">
                <Button
                  variant="secondary"
                  size="icon-sm"
                  icon={InfoIcon}
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspect(torrent);
                  }}
                />
                <Button
                  size="sm"
                  icon={DownloadIcon}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(torrent);
                  }}
                >
                  <Trans>Download</Trans>
                </Button>
              </div>
            );
          },
          enableSorting: false,
        }),
      ]),
    [media.original_language, count, onInspect, onDownload],
  );
}
