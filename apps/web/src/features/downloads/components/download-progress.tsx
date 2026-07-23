import { Trans, useLingui } from "@lingui/react/macro";
import type { Download } from "@seedarr/sdk";
import { formatBytes, formatTime } from "@seedarr/shared";
import { Link } from "@tanstack/react-router";
import { ClockIcon, DownloadIcon, InfoIcon, PauseIcon, UploadIcon } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Progress } from "@/shared/ui/progress";
import { ProgressCircular } from "@/shared/ui/progress-circular";

import { getDownloadStatus } from "@/features/downloads/helpers/downloads.helper";
import { useDownloadPause, useDownloadResume } from "@/features/torrent/hooks/download.queries";

const CIRCULAR_SIZE = 50;
const CIRCULAR_STROKE = 4;

interface DownloadProgressProps {
  download: Download;
  variant?: "bar" | "circular";
  /** Show a link to the download detail page (bar only). */
  showInfoLink?: boolean;
  /** Larger typography for the download detail page (bar only). */
  size?: "default" | "lg";
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
  variant = "bar",
  showInfoLink = false,
  size = "default",
  onPauseResume,
}: DownloadProgressProps) {
  if (variant === "circular") return <CircularProgress download={download} onPauseResume={onPauseResume} />;

  return <BarProgress download={download} showInfoLink={showInfoLink} size={size} onPauseResume={onPauseResume} />;
}

function CircularProgress({ download, onPauseResume }: { download: Download; onPauseResume?: () => void }) {
  const { t } = useLingui();
  const { toggle } = usePauseToggle(download, onPauseResume);

  const isPaused = getDownloadStatus(download) === "paused";
  const value = (download.torrent?.progress ?? 0) * 100;

  return (
    <ProgressCircular
      value={value}
      size={CIRCULAR_SIZE}
      strokeWidth={CIRCULAR_STROKE}
      color={isPaused ? "text-warning" : "text-primary"}
    >
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
    </ProgressCircular>
  );
}

function BarProgress({
  download,
  showInfoLink,
  size,
  onPauseResume,
}: {
  download: Download;
  showInfoLink: boolean;
  size: "default" | "lg";
  onPauseResume?: () => void;
}) {
  const { t } = useLingui();
  const { toggle, isPending } = usePauseToggle(download, onPauseResume);

  const isLg = size === "lg";
  const textSize = isLg ? "text-xl font-bold" : "text-sm font-semibold";
  const iconSize = isLg ? "size-4" : "size-3.5";

  // Cas 1 : En cours de transfert
  if (download.torrent?.transferring) {
    const progress = (download.torrent?.transferProgress ?? 0) * 100;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={`${textSize} text-blue-500`}>{progress.toFixed(isLg ? 1 : 0)}%</span>
          <Badge variant="secondary" className="flex items-center gap-1">
            <UploadIcon className="size-3" />
            <Trans>Transferring</Trans>
          </Badge>
        </div>
        <Progress value={progress} variant="transfer" />
      </div>
    );
  }

  // Cas 2 : Téléchargement actif ou en pause
  const status = getDownloadStatus(download);
  if (status !== "downloading" && status !== "queued" && status !== "paused") return null;

  const isPaused = status === "paused";
  const sizeBytes = download.torrent?.length ?? 0;
  const downloaded = download.torrent?.downloaded ?? 0;
  const progress = (download.torrent?.progress ?? (sizeBytes > 0 ? downloaded / sizeBytes : 0)) * 100;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {isPaused ? (
            <span className={textSize}>
              <Trans>Paused</Trans>
            </span>
          ) : (
            <>
              <span className={textSize}>{progress.toFixed(isLg ? 1 : 0)}%</span>
              <Badge variant="secondary" className="flex items-center gap-1">
                <ClockIcon className="size-3" />
                <span>{formatTime(download.torrent?.timeRemaining)}</span>
              </Badge>
            </>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {formatBytes(downloaded)} / {formatBytes(sizeBytes)}
        </span>
      </div>

      <div className="flex gap-2 items-center">
        <Progress value={progress} variant={isPaused ? "paused" : "default"} className="flex-1" />
        <Button size={isLg ? "default" : "sm"} onClick={toggle} disabled={!onPauseResume && isPending}>
          {isPaused ? <DownloadIcon className={iconSize} /> : <PauseIcon className={iconSize} />}
          <span>{isPaused ? <Trans>Resume</Trans> : <Trans>Pause</Trans>}</span>
        </Button>

        {showInfoLink && (
          <Button size={isLg ? "icon" : "icon-sm"} variant="outline" asChild aria-label={t`Open download`}>
            <Link to="/downloads/$id" params={{ id: download.id }}>
              <InfoIcon className={iconSize} />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
