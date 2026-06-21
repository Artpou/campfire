import { useEffect, useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { DownloadStats } from "@seedarr/sdk";
import { formatBytes } from "@seedarr/shared";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, YAxis } from "recharts";

import { Card } from "@/shared/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/ui/sheet";

import { downloadStatsQueries } from "../hooks/download-stats.queries";
import { DownloadNetworkCard } from "./download-network-card";

interface NetworkDataPoint {
  time: string;
  download: number;
  upload: number;
}

interface DownloadStatsChartProps {
  stats: DownloadStats;
}

function DownloadStatsChart({ stats }: DownloadStatsChartProps) {
  const [history, setHistory] = useState<NetworkDataPoint[]>([]);

  useEffect(() => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

    setHistory((prev) => {
      const newData = [
        ...prev,
        {
          time: timeStr,
          download: stats.downloadSpeed / 1024 / 1024,
          upload: stats.uploadSpeed / 1024 / 1024,
        },
      ];
      return newData.slice(-30);
    });
  }, [stats.downloadSpeed, stats.uploadSpeed]);

  if (history.length < 2) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground text-center py-8">
          <Trans>Collecting data...</Trans>
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-0 pl-2 pt-2">
      <div className="h-40">
        <ResponsiveContainer>
          <AreaChart data={history}>
            <defs>
              <linearGradient id="colorDownload" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorUpload" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--blue)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <YAxis
              className="text-xs"
              tick={{ fill: "var(--muted-foreground)" }}
              label={{ value: "MB/s", angle: -90, position: "insideLeft" }}
            />
            <Area
              type="monotone"
              dataKey="download"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#colorDownload)"
              name="Download"
              animationDuration={300}
              animationEasing="ease-in-out"
            />
            <Area
              type="monotone"
              dataKey="upload"
              stroke="var(--blue)"
              strokeWidth={2}
              fill="url(#colorUpload)"
              name="Upload"
              animationDuration={300}
              animationEasing="ease-in-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

interface DownloadsStatsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DownloadsStatsPanel({ open, onOpenChange }: DownloadsStatsPanelProps) {
  const { data: stats } = useQuery({ ...downloadStatsQueries.get(), refetchInterval: open ? 1000 : 5000 });

  if (!stats) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            <Trans>Download Statistics</Trans>
          </SheetTitle>
          <SheetDescription>
            <Trans>Real-time network activity and library overview</Trans>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3 text-center">
              <p className="text-xs text-muted-foreground">
                <Trans>Medias</Trans>
              </p>
              <p className="text-2xl font-bold">{stats.count}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-xs text-muted-foreground">
                <Trans>Total Size</Trans>
              </p>
              <p className="text-2xl font-bold">{formatBytes(stats.totalSize)}</p>
            </Card>
          </div>

          <DownloadStatsChart stats={stats} />

          <div className="space-y-2">
            <DownloadNetworkCard type="download" value={stats.downloadSpeed} />
            <DownloadNetworkCard type="upload" value={stats.uploadSpeed} />
            <DownloadNetworkCard type="peers" value={stats.peers} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
