import type { Download, Movie, TV } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { ClapperboardIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Badge } from "@/shared/ui/badge";
import { Img } from "@/shared/ui/image";
import { Progress } from "@/shared/ui/progress";

import { useRole } from "@/features/auth/hooks/use-role";
import { downloadQueries } from "@/features/downloads/hooks/download.queries";
import { MediaDownloadButton } from "@/features/media/components/button/media-button-download";
import { MediaButtonPlay } from "@/features/media/components/button/media-button-play";
import { MediaButtonRequest } from "@/features/media/components/button/media-button-request";
import { MediaButtonTorrent } from "@/features/media/components/button/media-button-torrent";
import { MediaButtonTrailer } from "@/features/media/components/button/media-button-trailer";
import {
  getBackdropUrl,
  getPosterUrl,
  getWatchProgressPercent,
  hasWatchProgress,
} from "@/features/media/helpers/media.helper";
import { trailerQueries } from "@/features/media/hooks/trailer.queries";

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

/** Poster + coherent full-width action stack (trailer / torrents / play / delete). */
export function MediaPoster({ data, download }: MediaPosterProps) {
  const { role } = useRole();
  const isMobile = useIsMobile();
  const locale = useTmdbLocale();
  const { media } = data;

  const { data: videoFile } = useQuery({
    ...downloadQueries.videoFile(download?.id ?? ""),
    enabled: !!download?.id,
  });

  const { data: trailer } = useQuery({
    ...trailerQueries.get(media, locale),
    enabled: isMobile,
  });

  const displayTitle = getDisplayTitle(data);
  const showWatchProgress = hasWatchProgress(media);
  const watchProgressPercent = getWatchProgressPercent(media);
  const canPlay = Boolean(download);
  const canDownload = Boolean(download && (!download.torrent || download.torrent.done) && videoFile);

  if (isMobile) {
    if (download) {
      return (
        <div className="flex w-full flex-col gap-2">
          <div className="group/poster relative aspect-video w-full overflow-hidden rounded-md bg-muted">
            <Img
              src={getBackdropUrl(media.backdrop_path, "w1280")}
              alt={displayTitle}
              className="size-full object-cover"
              fallback={<ClapperboardIcon className="size-10 text-muted-foreground" />}
            />
            <MediaButtonPlay
              className="absolute inset-0 flex items-center justify-center bg-black/20"
              media={media}
              downloadId={download.id}
              circular
            />
            {download.quality && (
              <Badge variant="glass" className="absolute top-2 left-2">
                {download.quality}
              </Badge>
            )}
          </div>
          {showWatchProgress && <Progress value={watchProgressPercent} max={100} className="h-1 w-full" />}
          <MediaButtonTrailer title={displayTitle} data={data} variant="secondary" className="w-full" size="lg" />
          {canDownload && videoFile && (
            <MediaDownloadButton media={media} videoFile={videoFile} className="w-full" size="lg" />
          )}
        </div>
      );
    }

    return (
      <div className="flex w-full flex-col gap-2">
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {trailer?.key ? (
            <iframe
              src={`https://www.youtube.com/embed/${trailer.key}?controls=0&modestbranding=1&rel=0&showinfo=0`}
              className="absolute inset-0 size-full pointer-events-none rounded-md"
              allow="autoplay; encrypted-media"
              title={trailer.name}
            />
          ) : (
            <Img
              src={getBackdropUrl(media.backdrop_path, "w1280")}
              alt={displayTitle}
              className="size-full object-cover"
            />
          )}
        </div>
        {role !== "viewer" && <MediaButtonTorrent media={media} className="w-full" size="lg" />}
        {role === "viewer" && <MediaButtonRequest media={media} className="w-full" size="lg" />}
        <MediaButtonTrailer title={displayTitle} data={data} variant="secondary" className="w-full" size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[250px] shrink-0 flex-col gap-2 lg:mx-0">
      <div className="relative aspect-2/3 w-full">
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
              className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover/poster:bg-black/50"
              media={media}
              downloadId={download?.id}
              circular
            />
          )}

          {download?.quality && (
            <Badge variant="glass" className="absolute top-2 left-2">
              {download.quality}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex w-full flex-col gap-2">
        <MediaButtonPlay media={media} downloadId={download?.id} className="w-full" />
        {!download && role !== "viewer" && <MediaButtonTorrent media={media} className="w-full" size="lg" />}
        {!download && role === "viewer" && <MediaButtonRequest media={media} className="w-full" size="lg" />}
        {!download && (
          <MediaButtonTrailer title={displayTitle} data={data} variant="secondary" className="w-full" size="lg" />
        )}

        {canDownload && videoFile && <MediaDownloadButton media={media} videoFile={videoFile} className="w-full" />}
      </div>
    </div>
  );
}
