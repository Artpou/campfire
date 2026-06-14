import type { Download } from "@seedarr/sdk";
import { DownloadIcon, PauseIcon } from "lucide-react";

import { ProgressCircular } from "@/shared/ui/progress-circular";

import { getDownloadStatus } from "@/features/downloads/helpers/downloads.helper";
import { useDownloadPause, useDownloadResume } from "@/features/torrent/hooks/download.queries";

const SIZE = 50;
const STROKE_WIDTH = 4;

interface DownloadProgressCircularProps {
  download: Download;
}

export function DownloadProgressCircular({ download }: DownloadProgressCircularProps) {
  const status = getDownloadStatus(download);
  const value = download.torrent?.progress ? download.torrent.progress * 100 : 0;
  const color = status === "paused" ? "text-warning" : "text-primary";

  const { mutate: pause } = useDownloadPause();
  const { mutate: resume } = useDownloadResume();

  return (
    <ProgressCircular value={value} size={SIZE} strokeWidth={STROKE_WIDTH} color={color}>
      {status === "paused" ? (
        <div className="group/download-progress-circular">
          <PauseIcon
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              pause(download.id);
            }}
            className="size-4 group-hover/download-progress-circular:hidden"
          />
          <DownloadIcon
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              resume(download.id);
            }}
            className="size-4 hidden group-hover/download-progress-circular:block"
          />
        </div>
      ) : (
        <span className="font-bold tracking-tighter flex items-center" style={{ fontSize: SIZE * 0.38 }}>
          {Math.round(value)}
          <span className="ml-0.5 opacity-90" style={{ fontSize: SIZE * 0.26 }}>
            %
          </span>
        </span>
      )}
    </ProgressCircular>
  );
}
