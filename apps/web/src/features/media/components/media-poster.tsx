import type { Download, Movie, TV } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { ClapperboardIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Img } from "@/shared/ui/image";

import { useRole } from "@/features/auth/hooks/use-role";
import { DownloadButtonDelete } from "@/features/downloads/components/button/download-button-delete";
import { downloadQueries } from "@/features/downloads/hooks/download.queries";
import { MediaDownloadButton } from "@/features/media/components/button/media-button-download";
import { MediaButtonPlay } from "@/features/media/components/button/media-button-play";
import { MediaButtonRequest } from "@/features/media/components/button/media-button-request";
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

/** Poster + coherent full-width action stack (trailer / torrents / play / delete). */
export function MediaPoster({ data, download }: MediaPosterProps) {
  const { role } = useRole();
  const { media } = data;

  const { data: videoFile } = useQuery({
    ...downloadQueries.videoFile(download?.id ?? ""),
    enabled: !!download?.id,
  });

  const displayTitle = getDisplayTitle(data);
  const showWatchProgress = hasWatchProgress(media);
  const canPlay = Boolean(download);
  const canDownload = Boolean(download && (!download.torrent || download.torrent.done) && videoFile);

  return (
    <div className="flex flex-col shrink-0 w-full max-w-[250px] mx-auto lg:mx-0 gap-2">
      <div className="relative w-full aspect-2/3">
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

      <div className="flex flex-col w-full gap-2">
        <MediaButtonPlay media={media} downloadId={download?.id} className="w-full" />
        {!download && role !== "viewer" && <MediaButtonTorrent media={media} className="w-full" size="lg" />}
        {!download && role === "viewer" && <MediaButtonRequest media={media} className="w-full" size="lg" />}
        {!download && (
          <MediaButtonTrailer title={displayTitle} data={data} variant="secondary" className="w-full" size="lg" />
        )}

        {canDownload && videoFile && <MediaDownloadButton media={media} videoFile={videoFile} className="w-full" />}
        <DownloadButtonDelete media={media} download={download ?? null} />
      </div>
    </div>
  );
}
