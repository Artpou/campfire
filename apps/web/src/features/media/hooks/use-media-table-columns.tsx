import { useMemo } from "react";

import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table";
import { ClockPlusIcon, HeartIcon } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { DataTableColumnHeader } from "@/shared/ui/data-table-column-header";

import { MediaBadgeRating } from "@/features/media/components/badge/media-badge-rating";
import { MediaBadgeType } from "@/features/media/components/badge/media-badge-type";
import { MediaButtonPlay } from "@/features/media/components/button/media-button-play";
import { MediaButtonReview } from "@/features/media/components/button/media-button-review";
import { getPosterUrl } from "@/features/media/helpers/media.helper";

export const mediaTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});

type MediaTableFeatures = typeof mediaTableFeatures;

const columnHelper = createColumnHelper<MediaTableFeatures, Media>();

function activityDate(media: Media): Date | null {
  const raw = media.activityAt ?? media.userReviewAt ?? media.progress?.updatedAt;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function useMediaTableColumns({ showActions = true }: { showActions?: boolean } = {}) {
  return useMemo(
    () =>
      columnHelper.columns([
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
            const year = m.release_date ? new Date(m.release_date).getFullYear() : null;
            return (
              <div className="space-y-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="font-medium truncate text-sm md:text-base">{m.title || m.original_title}</p>
                  {year != null && <span className="text-xs text-muted-foreground">{year}</span>}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <MediaBadgeType type={m.type} />

                  {m.liked && (
                    <Badge variant="glass">
                      <HeartIcon className="fill-primary text-primary shrink-0" />
                    </Badge>
                  )}
                  {m.inWatchList && (
                    <Badge variant="glass">
                      <ClockPlusIcon className="text-primary shrink-0" />
                    </Badge>
                  )}
                  <MediaBadgeRating media={m} />
                </div>
              </div>
            );
          },
          sortFn: "text",
        }),
        columnHelper.accessor((row) => activityDate(row)?.getTime() ?? 0, {
          id: "date",
          meta: { headerClassName: "w-24 md:w-28", cellClassName: "w-24 md:w-28" },
          header: ({ column }) => <DataTableColumnHeader column={column} title={<Trans>Date</Trans>} />,
          cell: ({ row }) => {
            const date = activityDate(row.original);
            return (
              <span className="text-xs md:text-sm text-popover-foreground whitespace-nowrap">
                {date ? date.toLocaleDateString() : "—"}
              </span>
            );
          },
        }),
        ...(showActions
          ? [
              columnHelper.display({
                id: "actions",
                meta: { headerClassName: "w-36 md:w-44", cellClassName: "w-36 md:w-44" },
                cell: ({ row }) => (
                  <div className="flex items-center justify-end gap-1.5">
                    <MediaButtonReview media={row.original} />
                    <MediaButtonPlay media={row.original} size="sm" />
                  </div>
                ),
                enableSorting: false,
              }),
            ]
          : []),
      ]),
    [showActions],
  );
}
