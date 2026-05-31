import { useMemo, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { ClapperboardIcon, MagnetIcon, Play } from "lucide-react";
import type { AppendToResponse, MovieDetails, TvShowDetails } from "tmdb-ts";

import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/shared/ui/dialog";

import { useRole } from "@/features/auth/hooks/use-role";
import { getPosterUrl } from "@/features/media/helpers/media.helper";
import { useMedia } from "@/features/media/hooks/use-media";

type MediaPosterMedia =
  | AppendToResponse<MovieDetails, "videos"[], "movie">
  | AppendToResponse<TvShowDetails, "videos"[], "tvShow">;

interface MediaPosterProps {
  media: MediaPosterMedia;
  id?: number;
  type?: "movie" | "tv";
}

function getDisplayTitle(media: MediaPosterMedia): string {
  if ("title" in media && media.title) return media.title;
  if ("name" in media && media.name) return media.name;
  return "";
}

export function MediaPoster({ media, id, type = "movie" }: MediaPosterProps) {
  const { role } = useRole();
  const { i18n } = useLingui();

  const [imgError, setImgError] = useState(false);

  const { data: localMedia } = useMedia(id ?? 0, { enabled: !!id });
  const downloadId = localMedia?.downloadId;

  const displayTitle = getDisplayTitle(media);

  const youtubeTrailer = useMemo(() => {
    const videos = media?.videos?.results;
    if (!videos) return null;

    return (
      videos.find(
        (v) => v.site === "YouTube" && v.type === "Trailer" && v.iso_3166_1 === i18n.locale,
      ) ??
      videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
      videos.find((v) => v.site === "YouTube")
    );
  }, [media?.videos, i18n.locale]);

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

        {downloadId && (
          <Link
            to="/downloads/$id/play"
            params={{ id: downloadId }}
            className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity rounded-md"
          >
            <div className="size-16 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Play className="size-8 fill-current text-primary-foreground ml-1" />
            </div>
          </Link>
        )}
      </div>

      {youtubeTrailer && (
        <Dialog>
          <DialogTrigger className="cursor-pointer" asChild>
            <Button variant="secondary" className="w-full">
              <Play className="size-3 fill-current mr-2" />
              <Trans>Watch Trailer</Trans>
            </Button>
          </DialogTrigger>
          <DialogContent
            className="sm:max-w-[90vw] max-w-[95vw] p-0 border-none aspect-video"
            showCloseButton={false}
          >
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

      {media && role !== "viewer" && id && (
        <Button className="w-full" asChild>
          {type === "tv" ? (
            <Link to="/tv/$id/torrents" params={{ id: id.toString() }}>
              <MagnetIcon className="size-3 mr-2" />
              <Trans>Torrents</Trans>
            </Link>
          ) : (
            <Link to="/movies/$id/torrents" params={{ id: id.toString() }}>
              <MagnetIcon className="size-3 mr-2" />
              <Trans>Torrents</Trans>
            </Link>
          )}
        </Button>
      )}
    </div>
  );
}
