import { useEffect, useState } from "react";

import type { Download } from "@seedarr/sdk";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, YAxis } from "recharts";

import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { Card } from "@/shared/ui/card";

import { getDownloadStatus } from "@/features/downloads/helpers/downloads.helper";

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

  useEffect(() => {
    if (download.torrent) {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

      setNetworkHistory((prev) => {
        const newData = [
          ...prev,
          {
            time: timeStr,
            download: (download.torrent?.downloadSpeed ?? 0) / 1024 / 1024,
            upload: (download.torrent?.uploadSpeed ?? 0) / 1024 / 1024,
          },
        ];
        return newData.slice(-30);
      });
    }
  }, [download.torrent]);

  if (networkHistory.length < 2) {
    return (
      <Card className="p-3">
        <SeedarrLoader className="my-11" size={40} />
      </Card>
    );
  }

  return (
    <Card className="p-0 pl-2 pt-2">
      <div className="h-32">
        <ResponsiveContainer>
          <AreaChart data={networkHistory}>
            <defs>
              {status === "completed" ? (
                <linearGradient id="colorData" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--blue)" stopOpacity={0} />
                </linearGradient>
              ) : (
                <linearGradient id="colorData" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={status === "downloading" ? "var(--primary)" : "var(--warning)"}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={status === "downloading" ? "var(--primary)" : "var(--warning)"}
                    stopOpacity={0}
                  />
                </linearGradient>
              )}
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <YAxis
              className="text-xs"
              tick={{ fill: "var(--muted-foreground)" }}
              label={{ value: "MB/s", angle: -90, position: "insideLeft" }}
            />
            {status === "completed" ? (
              <Area
                type="monotone"
                dataKey="upload"
                stroke="var(--blue)"
                strokeWidth={2}
                fill="url(#colorData)"
                name="Upload"
                animationDuration={300}
                animationEasing="ease-in-out"
              />
            ) : (
              <Area
                type="monotone"
                dataKey="download"
                stroke={status === "downloading" ? "var(--primary)" : "var(--warning)"}
                strokeWidth={2}
                fill="url(#colorData)"
                name="Download"
                animationDuration={300}
                animationEasing="ease-in-out"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
