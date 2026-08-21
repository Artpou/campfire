import { useMemo } from "react";

import { Trans } from "@lingui/react/macro";
import type { ModuleType } from "@seedarr/contracts";
import type { Activity } from "@seedarr/sdk";
import { getModuleCatalogEntry } from "@seedarr/shared";
import { Link } from "@tanstack/react-router";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table";
import { InfoIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { DataTableColumnHeader } from "@/shared/ui/data-table-column-header";
import { Img } from "@/shared/ui/image";

import { getPosterUrl } from "@/features/media/helpers/media.helper";
import { SettingsActivityBadgeType } from "@/features/settings/components/badge/settings-activity-badge-type";
import {
  formatActivityAction,
  getActivityActionIcon,
  parseActivityMetadata,
} from "@/features/settings/helpers/activity.helper";
import { UserProfile } from "@/features/user/components/user-profile";

export const activityTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { text: sortFn_text },
});

type ActivityTableFeatures = typeof activityTableFeatures;
const columnHelper = createColumnHelper<ActivityTableFeatures, Activity>();

function moduleLogo(type: string): string {
  try {
    return getModuleCatalogEntry(type as ModuleType).logo ?? "/modules/stremio.svg";
  } catch {
    return "/modules/stremio.svg";
  }
}

function ActivitySubjectCell({ log }: { log: Activity }) {
  const metadata = parseActivityMetadata(log.metadata);
  const moduleType = log.module?.type ?? (typeof metadata?.type === "string" ? metadata.type : null);
  const Icon = getActivityActionIcon(log.action);

  const media = log.media;
  const poster = getPosterUrl(media?.poster_path, "w92");
  const image = (
    <Img
      src={poster || moduleLogo(moduleType ?? "")}
      alt={media?.title || moduleType || ""}
      fallback={
        <div className="w-10 h-14 flex items-center justify-center rounded bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>
      }
      className={cn("w-10 h-14 rounded shrink-0", moduleType ? "object-contain" : "object-cover")}
    />
  );

  if (media || moduleType) {
    return (
      <Link
        to={moduleType ? `/settings/modules/$id` : media?.type === "tv" ? "/tv/$id" : "/movies/$id"}
        params={{ id: moduleType ? (log.module?.id ?? "") : (media?.id.toString() ?? "") }}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0"
      >
        {image}
      </Link>
    );
  }

  return image;
}

interface UseActivityColumnsOptions {
  onDetail: (log: Activity) => void;
}

export function useActivityColumns({ onDetail }: UseActivityColumnsOptions) {
  return useMemo(
    () =>
      columnHelper.columns([
        columnHelper.display({
          id: "subject",
          meta: { headerClassName: "w-16", cellClassName: "w-16 align-top" },
          cell: ({ row }) => <ActivitySubjectCell log={row.original} />,
        }),
        columnHelper.accessor("action", {
          id: "action",
          header: ({ column }) => <DataTableColumnHeader column={column} title={<Trans>Action</Trans>} />,
          cell: ({ row }) => {
            const Icon = getActivityActionIcon(row.original.action);

            return (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Icon className="size-4" />
                  <span className="font-medium truncate text-sm md:text-base">
                    {formatActivityAction(row.original.action)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground max-w-60 truncate">
                  {row.original.module?.type || row.original.media?.title || ""}
                </span>
              </div>
            );
          },
          sortFn: "text",
        }),
        columnHelper.accessor("type", {
          id: "type",
          meta: { headerClassName: "w-28", cellClassName: "w-28" },
          header: () => <Trans>Status</Trans>,
          cell: ({ row }) => <SettingsActivityBadgeType type={row.original.type} />,
        }),
        columnHelper.display({
          id: "user",
          header: () => <Trans>User</Trans>,
          cell: ({ row }) => {
            const user = row.original.user;
            if (!user) return <span className="text-muted-foreground">—</span>;
            return <UserProfile user={user} size="sm" />;
          },
        }),
        columnHelper.accessor((row) => new Date(row.createdAt).getTime(), {
          id: "date",
          meta: { headerClassName: "w-36 md:w-44", cellClassName: "w-36 md:w-44" },
          header: ({ column }) => <DataTableColumnHeader column={column} title={<Trans>Date</Trans>} />,
          cell: ({ row }) => (
            <span className="text-xs md:text-sm text-muted-foreground whitespace-nowrap">
              {new Date(row.original.createdAt).toLocaleString()}
            </span>
          ),
        }),
        columnHelper.display({
          id: "detail",
          meta: { headerClassName: "w-12 text-right", cellClassName: "w-12 text-right" },
          cell: ({ row }) => (
            <Button
              variant="secondary"
              size="icon-sm"
              icon={InfoIcon}
              tooltip={<Trans>Details</Trans>}
              aria-label="Details"
              onClick={(e) => {
                e.stopPropagation();
                onDetail(row.original);
              }}
            />
          ),
        }),
      ]),
    [onDetail],
  );
}
