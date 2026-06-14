import { useMemo, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { Movie, TV } from "@seedarr/sdk";
import { Link } from "@tanstack/react-router";
import { ClapperboardIcon, FilmIcon, MagnetIcon, PlayIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/shared/ui/dialog";
import { Progress } from "@/shared/ui/progress";

import { useRole } from "@/features/auth/hooks/use-role";
import { getPosterUrl } from "@/features/media/helpers/media.helper";

interface MediaPosterProps {
  data: Movie | TV;
  downloadId?: string;
  type?: "movie" | "tv";
}

function getDisplayTitle(data: Movie | TV): string {
  const item = "movie" in data ? data.movie : data.tv;
  if ("title" in item && item.title) return item.title;
  if ("name" in item && item.name) return item.name;
  return "";
}

export function MediaPoster({ data, downloadId, type = "movie" }: MediaPosterProps) {
  const { role } = useRole();
  const { i18n } = useLingui();

  const [imgError, setImgError] = useState(false);

  const displayTitle = getDisplayTitle(data);
  const { media } = data;
  const item = "movie" in data ? data.movie : data.tv;

  const youtubeTrailer = useMemo(() => {
    const videos = item?.videos?.results;
    if (!videos) return null;

    return (
      videos.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.iso_3166_1 === i18n.locale) ??
      videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
      videos.find((v) => v.site === "YouTube")
    );
  }, [item?.videos, i18n.locale]);

  return (
    <div className="flex flex-col shrink-0 space-y-2 items-center max-w-[230px]">
      <div className="relative">
        {!imgError && !!media.poster_path ? (
          <img
            src={getPosterUrl(media.poster_path, "w500")}
            alt={displayTitle}
            className="w-[200px] sm:w-full aspect-2/3 rounded-md object-cover border border-secondary shadow-2xl"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-[200px] size-full aspect-2/3 rounded-md flex items-center justify-center border border-border">
            <ClapperboardIcon className="size-10 text-muted-foreground" />
          </div>
        )}

        {media.progress && media.progress.position > 0 && (
          <Progress
            value={(media?.progress?.position / media?.progress?.duration) * 100}
            variant="white"
            className="absolute z-10 bottom-2 left-2 right-2 w-auto"
          />
        )}

        {downloadId && (
          <Link
            to="/downloads/$id/play"
            params={{ id: downloadId }}
            className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity rounded-md"
          >
            <div className="size-16 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <PlayIcon className="size-8 fill-current text-primary-foreground ml-1" />
            </div>
          </Link>
        )}
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

      {media && role !== "viewer" && media.id && (
        <Button className="w-full" asChild>
          {type === "tv" ? (
            <Link to="/tv/$id/torrents" params={{ id: media.id.toString() }}>
              <MagnetIcon className="size-3" />
              <Trans>Torrents</Trans>
            </Link>
          ) : (
            <Link to="/movies/$id/torrents" params={{ id: media.id.toString() }}>
              <MagnetIcon className="size-3" />
              <Trans>Torrents</Trans>
            </Link>
          )}
        </Button>
      )}
    </div>
  );
}
