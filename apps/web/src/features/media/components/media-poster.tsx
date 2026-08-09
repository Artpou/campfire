import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Download, Movie, TV } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { ClapperboardIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { DialogDelete } from "@/shared/components/dialog/dialog-delete";
import { Img } from "@/shared/ui/image";

import { downloadQueries, useDownloadDelete } from "@/features/downloads/hooks/download.queries";
import { MediaDownloadButton } from "@/features/media/components/button/media-button-download";
import { MediaButtonPlay } from "@/features/media/components/button/media-button-play";
import { MediaButtonTorrent } from "@/features/media/components/button/media-button-torrent";
import { MediaButtonTrailer } from "@/features/media/components/button/media-button-trailer";
import { getPosterUrl, hasWatchProgress } from "@/features/media/helpers/media.helper";

interface MediaPosterProps {
  data: Movie | TV;
  download?: Download | null;
}

function getDisplayTitle(data: Movie | TV): string {
  const item = "movie" in data ? data.movie : data.tv;
  if ("title" in item && item.title) return item.title;
  if ("name" in item && item.name) return item.name;
  return "";
}

export function MediaPoster({ data, download }: MediaPosterProps) {
  const deleteTorrent = useDownloadDelete();
  const { media } = data;

  const { data: videoFile, isLoading: isVideoFileLoading } = useQuery({
    ...downloadQueries.videoFile(download?.id ?? ""),
    enabled: !!download?.id,
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const displayTitle = getDisplayTitle(data);
  const showWatchProgress = hasWatchProgress(media);
  const canPlay = !isVideoFileLoading && download && !!videoFile;
  const canDownload = canPlay && (!download.torrent || download.torrent.done);

  const handleDelete = (dbOnly: boolean) => {
    if (!download?.id) return;
    deleteTorrent.mutate({ id: download.id, dbOnly }, { onSuccess: () => setShowDeleteConfirm(false) });
  };

  return (
    <div className="flex flex-col shrink-0 space-y-2 items-center max-w-[230px] w-full">
      <div className="relative w-[200px] sm:w-full aspect-2/3">
        <div
          className={cn(
            "group/poster relative w-full overflow-hidden rounded-md border border-secondary shadow-2xl",
            showWatchProgress ? "h-[calc(100%-0.75rem)]" : "h-full",
          )}
        >
          <Img
            fallback={<ClapperboardIcon className="size-10 text-muted-foreground" />}
            src={getPosterUrl(media.poster_path, "w500")}
            alt={displayTitle}
            className="size-full object-cover"
          />

          {canPlay && (
            <MediaButtonPlay
              className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/poster:bg-black/50 transition-colors"
              media={media}
              circular
            />
          )}
        </div>
      </div>

      {canDownload && <MediaDownloadButton media={media} videoFile={videoFile} />}

      {!download && <MediaButtonTrailer title={displayTitle} data={data} />}
      {!download && <MediaButtonTorrent media={media} />}

      <div className="flex flex-col w-full gap-2">
        <MediaButtonPlay media={media} disabled={!canPlay} />
      </div>

      <DialogDelete
        open={showDeleteConfirm}
        setOpen={setShowDeleteConfirm}
        validate={() => handleDelete(false)}
        disabled={deleteTorrent.isPending}
        title={<Trans>Delete Download</Trans>}
        description={<Trans>Are you sure you want to delete this download? This action cannot be undone.</Trans>}
      />
    </div>
  );
}
