import { useMemo, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { Download, Movie, TV } from "@seedarr/sdk";
import { useNavigate } from "@tanstack/react-router";
import { ClapperboardIcon, FilmIcon, PlayIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/shared/ui/dialog";

import { useRole } from "@/features/auth/hooks/use-role";
import { useDownloadDelete, useDownloadFile } from "@/features/downloads/hooks/download.queries";
import { MediaPlayButton } from "@/features/media/components/media-play-button";
import { getPosterUrl, hasWatchProgress } from "@/features/media/helpers/media.helper";
import { preloadMoviPlayer } from "@/features/player/helpers/movi-player.helper";

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
  const { role } = useRole();
  const { i18n, t } = useLingui();
  const navigate = useNavigate();
  const deleteTorrent = useDownloadDelete();
  const downloadFile = useDownloadFile();

  const [imgError, setImgError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const displayTitle = getDisplayTitle(data);
  const { media } = data;
  const item = "movie" in data ? data.movie : data.tv;
  const downloadId = download?.id;
  const canPlay = Boolean(downloadId);
  const showWatchProgress = hasWatchProgress(media);

  const youtubeTrailer = useMemo(() => {
    const videos = item?.videos?.results;
    if (!videos) return null;

    return (
      videos.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.iso_3166_1 === i18n.locale) ??
      videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
      videos.find((v) => v.site === "YouTube")
    );
  }, [item?.videos, i18n.locale]);

  const handleDelete = (dbOnly: boolean) => {
    if (!downloadId) return;
    deleteTorrent.mutate({ id: downloadId, dbOnly }, { onSuccess: () => setShowDeleteConfirm(false) });
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
          {!imgError && !!media.poster_path ? (
            <img
              src={getPosterUrl(media.poster_path, "w500")}
              alt={displayTitle}
              className="size-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="size-full flex items-center justify-center bg-muted">
              <ClapperboardIcon className="size-10 text-muted-foreground" />
            </div>
          )}

          {canPlay && downloadId && (
            <button
              type="button"
              className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/poster:bg-black/50 transition-colors cursor-pointer"
              onClick={() => navigate({ to: "/downloads/$id/play", params: { id: downloadId } })}
              onMouseEnter={preloadMoviPlayer}
              onFocus={preloadMoviPlayer}
              onPointerDown={preloadMoviPlayer}
              aria-label={t`Play`}
            >
              <span className="flex items-center justify-center size-16 rounded-full bg-primary/80 shadow-lg opacity-80 group-hover/poster:opacity-100 group-hover/poster:bg-primary group-hover/poster:scale-105 transition-all duration-300">
                <PlayIcon className="size-8 text-white fill-current ml-1" />
              </span>
            </button>
          )}
        </div>
      </div>

      {youtubeTrailer && (
        <Dialog>
          <DialogTrigger className="cursor-pointer" asChild>
            <Button variant="secondary" className="w-full">
              <FilmIcon className="size-3" />
              <Trans>Watch Trailer</Trans>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[90vw] max-w-[95vw] p-0 border-none aspect-video" showCloseButton={false}>
            <iframe
              src={`https://www.youtube.com/embed/${youtubeTrailer.key}?autoplay=1`}
              title={displayTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full rounded-lg"
            />
          </DialogContent>
        </Dialog>
      )}

      {downloadId && (
        <Button variant="secondary" className="w-full" onClick={() => downloadFile.mutateAsync(downloadId)}>
          <Trans>Download</Trans>
        </Button>
      )}

      {media && role !== "viewer" && media.id && (
        <div className="flex flex-col w-full gap-2">
          <MediaPlayButton media={media} />
        </div>
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Delete Download</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>Are you sure you want to delete this download? This action cannot be undone.</Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(false)}
              disabled={deleteTorrent.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
            >
              <Trans>Delete</Trans>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
