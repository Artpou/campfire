import { lazy, Suspense, useEffect, useState } from "react";

import type { Download } from "@seedarr/sdk";
import { PauseIcon } from "lucide-react";

import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { Card } from "@/shared/ui/card";

import { getDownloadStatus } from "@/features/downloads/helpers/downloads.helper";

const LazyRecharts = lazy(() =>
  import("recharts").then((mod) => ({
    default: ({ data, status }: { data: NetworkDataPoint[]; status: ReturnType<typeof getDownloadStatus> }) => {
      const { Area, AreaChart, CartesianGrid, ResponsiveContainer, YAxis } = mod;
      const color =
        status === "completed" ? "var(--blue)" : status === "downloading" ? "var(--primary)" : "var(--warning)";
      const dataKey = status === "completed" ? "upload" : "download";

      return (
        <ResponsiveContainer>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorData" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
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
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill="url(#colorData)"
              name={dataKey === "upload" ? "Upload" : "Download"}
              animationDuration={300}
              animationEasing="ease-in-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    },
  })),
);

interface NetworkDataPoint {
  time: string;
  download: number;
  upload: number;
}

interface DownloadNetworkChartProps {
  download: Download;
}

export function DownloadNetworkChart({ download }: DownloadNetworkChartProps) {
  const [networkHistory, setNetworkHistory] = useState<NetworkDataPoint[]>([]);
  const status = getDownloadStatus(download);
  const isPaused = status === "paused";

  useEffect(() => {
    if (download.torrent) {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

      setNetworkHistory((prev) => {
        const toMb = (bytes: number) => {
          const mb = bytes / 1024 / 1024;
          return mb < 0.001 ? 0 : mb;
        };

        const newData = [
          ...prev,
          {
            time: timeStr,
            download: toMb(download.torrent?.downloadSpeed ?? 0),
            upload: toMb(download.torrent?.uploadSpeed ?? 0),
          },
        ];
        return newData.slice(-30);
      });
    }
  }, [download.torrent]);

  // Seed a flat history when paused with too few samples so the chart still renders
  const chartData =
    networkHistory.length >= 2
      ? networkHistory
      : isPaused
        ? [
            { time: "00:00:00", download: 0, upload: 0 },
            { time: "00:00:01", download: 0, upload: 0 },
          ]
        : null;

  if (!chartData) {
    return (
      <Card className="p-3">
        <SeedarrLoader className="my-11" size={40} />
      </Card>
    );
  }

  return (
    <Card className="relative p-0 pl-2 pt-2">
      <div className="h-32">
        <Suspense fallback={<SeedarrLoader className="my-11" size={40} />}>
          <LazyRecharts data={chartData} status={status} />
        </Suspense>
      </div>
      {isPaused && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/60 rounded-xl">
          <div className="flex items-center justify-center size-10 rounded-full bg-warning/20 text-warning">
            <PauseIcon className="size-5 fill-current" />
          </div>
        </div>
      )}
    </Card>
  );
}
