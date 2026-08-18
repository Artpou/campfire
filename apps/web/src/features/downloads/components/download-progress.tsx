import { Trans, useLingui } from "@lingui/react/macro";
import type { Download } from "@seedarr/sdk";
import { formatBytes, formatTime } from "@seedarr/shared";
import { ClockIcon, DownloadIcon, PauseIcon, UploadIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Progress } from "@/shared/ui/progress";
import { ProgressCircular } from "@/shared/ui/progress-circular";

import { getDownloadStatus } from "@/features/downloads/helpers/downloads.helper";
import { useDownloadPause, useDownloadResume } from "@/features/downloads/hooks/download.queries";

const CIRCULAR_SIZE = 50;
const CIRCULAR_STROKE = 4;

interface DownloadProgressProps {
  download: Download;
  className?: string;
  variant?: "bar" | "circular";
  size?: "sm" | "md" | "lg";
  /** Override pause/resume (e.g. when the parent already owns the mutations). */
  onPauseResume?: () => void;
}

function usePauseToggle(download: Download, onPauseResume?: () => void) {
  const pauseTorrent = useDownloadPause();
  const resumeTorrent = useDownloadResume();

  const toggle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    if (onPauseResume) {
      onPauseResume();
      return;
    }

    if (getDownloadStatus(download) === "paused") {
      resumeTorrent.mutate(download.id);
    } else {
      pauseTorrent.mutate(download.id);
    }
  };

  return {
    toggle,
    isPending: pauseTorrent.isPending || resumeTorrent.isPending,
  };
}

export function DownloadProgress({
  download,
  className,
  variant = "bar",
  size = "md",
  onPauseResume,
}: DownloadProgressProps) {
  if (variant === "circular") return <CircularProgress download={download} onPauseResume={onPauseResume} />;

  return <BarProgress download={download} className={className} size={size} onPauseResume={onPauseResume} />;
}

function CircularProgress({ download, onPauseResume }: { download: Download; onPauseResume?: () => void }) {
  const { t } = useLingui();
  const { toggle } = usePauseToggle(download, onPauseResume);

  const isTransferring = Boolean(download.torrent?.transferring);
  const isPaused = getDownloadStatus(download) === "paused";
  const value = isTransferring
    ? (download.torrent?.transferProgress ?? 0) * 100
    : (download.torrent?.progress ?? 0) * 100;
  const color = isTransferring ? "text-blue-500" : isPaused ? "text-warning" : "text-primary";

  return (
    <ProgressCircular value={value} size={CIRCULAR_SIZE} strokeWidth={CIRCULAR_STROKE} color={color}>
      {isTransferring ? (
        <div className="flex flex-col items-center">
          <UploadIcon className="size-3" />
          <span className="font-bold tracking-tighter" style={{ fontSize: CIRCULAR_SIZE * 0.3 }}>
            {Math.round(value)}%
          </span>
        </div>
      ) : (
        <button
          type="button"
          className="group/dl-circular cursor-pointer bg-transparent border-0 p-0 text-inherit"
          onClick={toggle}
          aria-label={isPaused ? t`Resume` : t`Pause`}
        >
          {isPaused ? (
            <>
              <PauseIcon className="mt-1.5 size-4 group-hover/dl-circular:hidden" />
              <DownloadIcon className="mt-1.5 size-4 hidden group-hover/dl-circular:block" />
            </>
          ) : (
            <>
              <span
                className="font-bold tracking-tighter flex items-center group-hover/dl-circular:hidden"
                style={{ fontSize: CIRCULAR_SIZE * 0.38 }}
              >
                {Math.round(value)}
                <span className="ml-0.5 opacity-90" style={{ fontSize: CIRCULAR_SIZE * 0.26 }}>
                  %
                </span>
              </span>
              <PauseIcon className="mt-1 size-4 hidden group-hover/dl-circular:block" />
            </>
          )}
        </button>
      )}
    </ProgressCircular>
  );
}

function BarProgress({
  download,
  className,
  size,
  onPauseResume,
}: {
  download: Download;
  className?: string;
  size: "sm" | "md" | "lg";
  onPauseResume?: () => void;
}) {
  const { t } = useLingui();
  const { toggle, isPending } = usePauseToggle(download, onPauseResume);

  const textSize =
    size === "lg" ? "text-xl font-bold" : size === "sm" ? "text-xs font-medium" : "text-sm font-semibold";

  if (download.torrent?.transferring) {
    const progress = (download.torrent?.transferProgress ?? 0) * 100;
    const transferSpeed = download.torrent?.transferSpeed ?? 0;

    return (
      <div className={cn("space-y-1", className)}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className={`${textSize} text-blue-500`}>{progress.toFixed(size === "lg" ? 1 : 0)}%</span>
            {size !== "sm" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <UploadIcon className="size-3" />
                <Trans>Transferring</Trans>
              </Badge>
            )}
          </div>
          {transferSpeed > 0 && <span className="text-xs text-muted-foreground">{formatBytes(transferSpeed)}/s</span>}
        </div>
        <Progress value={progress} variant="transfer" />
      </div>
    );
  }

  const status = getDownloadStatus(download);
  if (status !== "downloading" && status !== "queued" && status !== "paused") return null;

  const isPaused = status === "paused";
  const sizeBytes = download.torrent?.length ?? 0;
  const downloaded = download.torrent?.downloaded ?? 0;
  const progress = (download.torrent?.progress ?? (sizeBytes > 0 ? downloaded / sizeBytes : 0)) * 100;

  if (size === "sm") {
    return (
      <div className={cn("flex gap-1 items-center max-w-[600px]", className)}>
        <Badge variant="secondary">
          {isPaused ? (
            <span className={textSize}>
              <Trans>Paused</Trans>
            </span>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className={textSize}>{progress.toFixed(0)}%</span>
              <span className="text-xs text-popover-foreground flex items-center gap-1 truncate">
                <ClockIcon className="size-3 shrink-0" />
                {formatTime(download.torrent?.timeRemaining)}
              </span>
            </div>
          )}
        </Badge>

        <Progress value={progress} variant={isPaused ? "paused" : "default"} />

        <Button
          size="icon-xs"
          onClick={toggle}
          disabled={!onPauseResume && isPending}
          icon={isPaused ? DownloadIcon : PauseIcon}
          aria-label={isPaused ? t`Resume` : t`Pause`}
        />
      </div>
    );
  }

  return (
    <div className={cn(className)}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {isPaused ? (
            <span className={textSize}>
              <Trans>Paused</Trans>
            </span>
          ) : (
            <>
              <span className={textSize}>{progress.toFixed(size === "lg" ? 1 : 0)}%</span>
              <Badge variant="secondary" className="flex items-center gap-1">
                <ClockIcon className="size-3" />
                <span>{formatTime(download.torrent?.timeRemaining)}</span>
              </Badge>
            </>
          )}
        </div>
        <Label variant="secondary">
          {formatBytes(downloaded)} / {formatBytes(sizeBytes)}
        </Label>
      </div>

      <div className="flex gap-2 items-center">
        <Progress value={progress} variant={isPaused ? "paused" : "default"} className="flex-1" />
        <Button
          size={size === "lg" ? "default" : "sm"}
          onClick={toggle}
          disabled={!onPauseResume && isPending}
          icon={isPaused ? DownloadIcon : PauseIcon}
        >
          {isPaused ? <Trans>Resume</Trans> : <Trans>Pause</Trans>}
        </Button>
      </div>
    </div>
  );
}
