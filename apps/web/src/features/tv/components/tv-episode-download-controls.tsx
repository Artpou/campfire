import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Download } from "@seedarr/sdk";
import { formatBytes, formatTime } from "@seedarr/shared";
import { ClockIcon, DownloadIcon, PauseIcon, Trash2Icon } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Progress } from "@/shared/ui/progress";

import { getDownloadStatus } from "@/features/downloads/helpers/downloads.helper";
import { useDownloadDelete, useDownloadPause, useDownloadResume } from "@/features/torrent/hooks/download.queries";
import { type EpisodeDeleteLabel, TvEpisodeDeleteDialog } from "@/features/tv/components/tv-episode-delete-dialog";

interface TvEpisodeDownloadControlsProps {
  download: Download;
  coveredEpisodes: EpisodeDeleteLabel[];
}

export function TvEpisodeDownloadControls({ download, coveredEpisodes }: TvEpisodeDownloadControlsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const pauseTorrent = useDownloadPause();
  const resumeTorrent = useDownloadResume();
  const deleteTorrent = useDownloadDelete();

  const status = getDownloadStatus(download);
  const isPaused = status === "paused";
  const isActive = status === "downloading" || status === "queued" || status === "paused";
  const size = download.torrent?.length ?? 0;
  const downloaded = download.torrent?.downloaded ?? 0;
  const progress = download.torrent?.progress ?? (size > 0 ? downloaded / size : 0);

  const handlePauseToggle = () => {
    if (isPaused) resumeTorrent.mutate(download.id);
    else pauseTorrent.mutate(download.id);
  };

  const handleDeleteConfirm = () => {
    deleteTorrent.mutate(download.id, {
      onSuccess: () => setShowDeleteConfirm(false),
    });
  };

  return (
    <>
      <div className="space-y-2 pt-1">
        {isActive && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{(progress * 100).toFixed(0)}%</span>
                <Badge variant="secondary" className="flex items-center gap-1">
                  {isPaused ? <PauseIcon className="size-3" /> : <ClockIcon className="size-3" />}
                  {isPaused ? <Trans>Paused</Trans> : <span>{formatTime(download.torrent?.timeRemaining)}</span>}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatBytes(downloaded)} / {formatBytes(size)}
              </span>
            </div>

            <div className="flex gap-2 items-center">
              <Progress value={progress * 100} variant={isPaused ? "paused" : "default"} className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                onClick={handlePauseToggle}
                disabled={pauseTorrent.isPending || resumeTorrent.isPending}
              >
                {isPaused ? <DownloadIcon className="size-3.5" /> : <PauseIcon className="size-3.5" />}
                <span>{isPaused ? <Trans>Resume</Trans> : <Trans>Pause</Trans>}</span>
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2Icon className="size-3.5" />
                <span className="sr-only sm:not-sr-only">
                  <Trans>Delete</Trans>
                </span>
              </Button>
            </div>
          </div>
        )}

        {!isActive && (
          <div className="flex justify-end">
            <Button size="sm" variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2Icon className="size-3.5" />
              <Trans>Delete</Trans>
            </Button>
          </div>
        )}
      </div>

      <TvEpisodeDeleteDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDeleteConfirm}
        episodes={coveredEpisodes}
        isPending={deleteTorrent.isPending}
      />
    </>
  );
}
