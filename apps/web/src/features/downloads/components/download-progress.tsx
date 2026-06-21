import { Trans } from "@lingui/react/macro";
import type { Download } from "@seedarr/sdk";
import { formatBytes, formatTime } from "@seedarr/shared";
import { ClockIcon, DownloadIcon, PauseIcon } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Progress } from "@/shared/ui/progress";

import { getDownloadStatus } from "@/features/downloads/helpers/downloads.helper";

interface DownloadProgressProps {
  download: Download;
  onClick: () => void;
}

export function DownloadProgress({ download, onClick }: DownloadProgressProps) {
  const status = getDownloadStatus(download);
  const size = download.torrent?.length ?? 0;
  const downloaded = download.torrent?.downloaded ?? 0;
  const progress = downloaded / size;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold">{(progress * 100).toFixed(1)}%</span>
          <Badge variant="secondary" className="flex items-center gap-1">
            {status === "downloading" ? <ClockIcon className="size-3" /> : <PauseIcon className="size-3" />}
            {status === "downloading" ? (
              <span>{formatTime(download.torrent?.timeRemaining)}</span>
            ) : (
              <Trans>Paused</Trans>
            )}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatBytes(downloaded)} / {formatBytes(size)}
        </span>
      </div>
      <div className="flex gap-2 items-center">
        <Progress value={progress * 100} variant={status === "paused" ? "paused" : "default"} />
        <Button onClick={onClick}>
          {status === "paused" ? <DownloadIcon className="size-4" /> : <PauseIcon className="size-4" />}
          <span>{status === "paused" ? <Trans>Resume</Trans> : <Trans>Pause</Trans>}</span>
        </Button>
      </div>
    </div>
  );
}
