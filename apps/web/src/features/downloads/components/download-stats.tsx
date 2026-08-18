import { Trans, useLingui } from "@lingui/react/macro";
import { formatBytes } from "@seedarr/shared";
import { useQuery } from "@tanstack/react-query";
import { HardDriveIcon, ServerIcon } from "lucide-react";

import { StatBlock, StatDivider } from "@/shared/components/stats/stat-block";
import { Card } from "@/shared/ui/card";
import { TooltipWrapper } from "@/shared/ui/tooltip-wrapper";

import { downloadQueries } from "@/features/downloads/hooks/download.queries";
import { ACTIVE_DOWNLOAD_INTERVAL } from "@/features/media/hooks/media.queries";
import { useStorageModule } from "@/features/module/hooks/use-module";

interface StorageSpace {
  seedarrUsed: number;
  diskUsed: number | null;
  diskTotal: number | null;
}

function StorageBar({ space, kind }: { space: StorageSpace; kind: "local" | "remote" }) {
  const { t } = useLingui();
  const { seedarrUsed, diskUsed, diskTotal } = space;
  const Icon = kind === "local" ? HardDriveIcon : ServerIcon;
  const label = kind === "local" ? t`Local storage` : t`Remote storage`;
  const seedarrColor = kind === "local" ? "text-primary" : "text-blue-500";
  const seedarrBarColor = kind === "local" ? "bg-primary" : "bg-blue-500";

  const seedarrPct = diskTotal ? Math.min(100, (seedarrUsed / diskTotal) * 100) : 100;
  const diskUsedPct = diskTotal && diskUsed != null ? Math.min(100, (diskUsed / diskTotal) * 100) : 0;

  let rightText: string | null = null;
  if (diskUsed != null && diskTotal != null) {
    const free = diskTotal - diskUsed;
    rightText = `${formatBytes(diskUsed)} / ${formatBytes(free)}`;
  } else if (diskTotal != null) {
    rightText = `${formatBytes(seedarrUsed)} / ${formatBytes(diskTotal)}`;
  }

  return (
    <TooltipWrapper tooltip={label}>
      <div className="flex items-center gap-3 min-w-[12rem] flex-1">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="flex-1 space-y-1 min-w-0">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-background">
            {diskTotal != null && diskUsed != null && (
              <div className="absolute inset-y-0 left-0 bg-muted-foreground/20" style={{ width: `${diskUsedPct}%` }} />
            )}
            <div className={`absolute inset-y-0 left-0 ${seedarrBarColor}`} style={{ width: `${seedarrPct}%` }} />
          </div>
          <div className="flex items-center justify-between gap-2 text-[10px] tabular-nums">
            <span className={`font-semibold ${seedarrColor}`}>{formatBytes(seedarrUsed)}</span>
            {rightText && <span className="text-muted-foreground">{rightText}</span>}
          </div>
        </div>
      </div>
    </TooltipWrapper>
  );
}

export function LibraryStats() {
  const { t } = useLingui();
  const { isEnabled: storageEnabled } = useStorageModule();
  const { data: stats } = useQuery({
    ...downloadQueries.stats(),
    refetchInterval: ({ state }) => {
      const s = state.data;
      if (!s) return false;
      return s.activeDownloads > 0 || s.downloadSpeed > 0 || s.uploadSpeed > 0 ? ACTIVE_DOWNLOAD_INTERVAL : false;
    },
  });

  if (!stats) return null;

  const hasStorage = stats.storage.local || (storageEnabled && stats.storage.remote);

  return (
    <div className="flex flex-col lg:flex-row justify-between gap-3">
      {hasStorage && (
        <div className="w-full lg:max-w-[50%] xl:max-w-[33%] flex flex-col gap-3">
          {stats.storage.local && (
            <Card className="w-full flex flex-row gap-4 py-2.5 px-4 items-center flex-wrap">
              <StorageBar space={stats.storage.local} kind="local" />
            </Card>
          )}

          {storageEnabled && stats.storage.remote && (
            <Card className="w-full flex flex-row gap-4 py-2.5 px-4 items-center flex-wrap">
              <StorageBar space={stats.storage.remote} kind="remote" />
            </Card>
          )}
        </div>
      )}

      <div className="flex items-start gap-3 w-full lg:max-w-[50%] xl:max-w-[33%]">
        <Card className="w-full flex flex-row gap-2 py-2 px-4 flex-wrap items-stretch">
          <StatBlock
            value={stats.movies.count}
            label={<Trans>Movies</Trans>}
            sublabel={formatBytes(stats.movies.totalSize)}
          />
          <StatDivider />
          <StatBlock value={stats.tv.count} label={<Trans>TV</Trans>} sublabel={formatBytes(stats.tv.totalSize)} />
          <StatDivider />
          <StatBlock
            value={
              stats.downloadSpeed > 0 ? <span className="text-primary">{formatBytes(stats.downloadSpeed)}/s</span> : "—"
            }
            label={<Trans>Download</Trans>}
            sublabel={t`${stats.activeDownloads} active`}
          />
        </Card>
      </div>
    </div>
  );
}
