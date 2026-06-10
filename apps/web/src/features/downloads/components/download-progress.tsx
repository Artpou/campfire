import { ClockIcon, PauseIcon, PlayIcon } from "lucide-react";

import { formatBytes, formatTime } from "@/shared/helpers/format.helper";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Progress } from "@/shared/ui/progress";

interface DownloadProgressProps {
  progress: number;
  downloaded: number;
  size: number;
  timeRemaining?: number;
  onClick: () => void;
  isPaused: boolean;
}

export function DownloadProgress({
  progress,
  downloaded,
  size,
  timeRemaining,
  onClick,
  isPaused,
}: DownloadProgressProps) {
  return (
    <div>
      {isPaused ? (
        <span className="text-xl font-bold text-muted-foreground">Paused</span>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold">{(progress * 100).toFixed(1)}%</span>
            <Badge variant="secondary" className="flex items-center gap-1">
              <ClockIcon className="size-3" />
              <span>{formatTime(timeRemaining)}</span>
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatBytes(downloaded)} / {formatBytes(size)}
          </span>
        </div>
      )}
      <div className="flex gap-2 items-center">
        <Progress value={progress * 100} className="h-2 shadow-md shadow-primary/20" />
        <Button variant="outline" size="icon" onClick={onClick}>
          {isPaused ? <PlayIcon className="size-4" /> : <PauseIcon className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
