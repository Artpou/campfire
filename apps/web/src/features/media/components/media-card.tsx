import { useState } from "react";

import type { Media } from "@basement/api/types";
import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle2Icon,
  ClapperboardIcon,
  ClockPlusIcon,
  DownloadIcon,
  FilmIcon,
  HeartIcon,
  MagnetIcon,
  PlayIcon,
  TvIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { CircularProgress } from "@/shared/components/circular-progress";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

import { getPosterUrl } from "@/features/media/helpers/media.helper";
import { useToggleLike, useToggleWatchList } from "@/features/media/hooks/use-media";

const MAX_TITLE_LENGTH = 30;
const MAX_OVERVIEW_LENGTH = 100;

interface MediaCardProps {
  media: Media;
  withType?: boolean;
  hideInfo?: boolean;
  className?: string;
  progressPercent?: number;
  resumeMode?: boolean;
}

export function MediaCard({
  media,
  withType = false,
  hideInfo = false,
  className,
  progressPercent,
  resumeMode = false,
}: MediaCardProps) {
  const toggleLike = useToggleLike();
  const toggleWatchList = useToggleWatchList();

  const [imgError, setImgError] = useState(false);

  const year = media.release_date ? new Date(media.release_date).getFullYear() : "";
  const detailLinkProps =
    media.type === "tv"
      ? ({ to: "/tv/$id", params: { id: media.id.toString() } } as const)
      : ({ to: "/movies/$id", params: { id: media.id.toString() } } as const);
  const torrentsLinkProps =
    media.type === "tv"
      ? ({ to: "/tv/$id/torrents", params: { id: media.id.toString() } } as const)
      : ({ to: "/movies/$id/torrents", params: { id: media.id.toString() } } as const);
  const playLinkProps = media.downloadId
    ? ({ to: "/downloads/$id/play", params: { id: media.downloadId } } as const)
    : null;

  const handleToggleLike = (_e: React.MouseEvent) => {
    toggleLike.mutate(media);
  };

  const handleToggleWatchList = (_e: React.MouseEvent) => {
    toggleWatchList.mutate(media);
  };

  if (hideInfo) {
    return (
      <Card className={cn("overflow-hidden aspect-2/3 relative pt-0 pb-0", className)}>
        <img
          src={getPosterUrl(media.poster_path, "w342")}
          alt={media.title}
          className="size-full object-cover"
        />
        {progressPercent != null && (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-muted/60">
            <div className="h-full bg-green-500" style={{ width: `${progressPercent}%` }} />
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden aspect-2/3 relative pt-0 pb-0 group", className)}>
      <Link {...detailLinkProps}>
        {!imgError && !!media.poster_path ? (
          <img
            src={getPosterUrl(media.poster_path, "w342")}
            alt={media.title}
            className="size-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="size-full aspect-square flex items-center justify-center">
            <ClapperboardIcon className="size-10 text-muted-foreground" />
          </div>
        )}
      </Link>

      {progressPercent != null && (
        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-muted/60 z-10">
          <div className="h-full bg-green-500" style={{ width: `${progressPercent}%` }} />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-background via-background/95 to-background/60 transition-all duration-200 translate-y-full p-2 group-hover:translate-y-0">
        <Link {...detailLinkProps}>
          <p className="text-xs font-bold">{year}</p>
          <h3 className="font-semibold text-base">
            {media.title?.slice(0, MAX_TITLE_LENGTH)}
            {media.title?.length > MAX_TITLE_LENGTH ? "..." : ""}
          </h3>
          <p className="text-muted-foreground text-xs">
            {media.overview?.slice(0, MAX_OVERVIEW_LENGTH)}
            {(media.overview?.length || 0) > MAX_OVERVIEW_LENGTH ? "..." : ""}
          </p>
        </Link>
        {resumeMode && playLinkProps ? (
          <Button className="w-full mt-1" asChild>
            <Link {...playLinkProps}>
              <PlayIcon className="size-4 fill-current" />
              <Trans>Resume</Trans>
            </Link>
          </Button>
        ) : (
          <Button className="w-full mt-1" asChild>
            <Link {...torrentsLinkProps}>
              <MagnetIcon />
              <Trans>Torrents</Trans>
            </Link>
          </Button>
        )}
      </div>
      {withType && (
        <div className="absolute top-2 left-2 flex gap-1 group-hover:hidden">
          <Button
            variant="outline"
            size="icon"
            aria-label={media.type === "movie" ? "Movie" : "TV"}
          >
            {media.type === "movie" ? <FilmIcon /> : <TvIcon />}
          </Button>
          {media.download && (
            <Button
              variant="outline"
              size="icon"
              aria-label="Downloaded"
              className="text-green-500"
            >
              <CheckCircle2Icon />
            </Button>
          )}
          {!media.download && media.downloadId && (
            <Button
              variant="outline"
              size="icon"
              aria-label="Downloading"
              className="text-yellow-500"
            >
              <DownloadIcon />
            </Button>
          )}
        </div>
      )}
      {!withType && media.download && (
        <Badge className="absolute top-2 left-2 gap-1 bg-green-600/90 hover:bg-green-600/90 text-white border-0 group-hover:hidden">
          <CheckCircle2Icon className="size-3" />
        </Badge>
      )}
      <div className="absolute top-2 left-2 right-2 flex justify-between gap-1">
        <div className="flex gap-1">
          {media.like !== undefined && (
            <Button
              variant={media.like ? "default" : "outline"}
              size="icon"
              tooltip={media.like ? <Trans>Unlike</Trans> : <Trans>Like</Trans>}
              className="sm:opacity-0 group-hover:opacity-100"
              onClick={handleToggleLike}
            >
              <HeartIcon fill={media.like ? "currentColor" : "none"} />
            </Button>
          )}
          {media.watchList !== undefined && (
            <Button
              variant={media.watchList ? "default" : "outline"}
              size="icon"
              tooltip={
                media.watchList ? (
                  <Trans>Remove from watch list</Trans>
                ) : (
                  <Trans>Add to watch list</Trans>
                )
              }
              className="sm:opacity-0 group-hover:opacity-100"
              onClick={handleToggleWatchList}
            >
              <ClockPlusIcon fill={media.watchList ? "currentColor" : "none"} />
            </Button>
          )}
        </div>
        {media.vote_average != null && media.vote_average > 0 && (
          <CircularProgress
            className="sm:opacity-0 group-hover:opacity-100"
            value={(media.vote_average || 0) * 10}
            size={52}
            strokeWidth={5}
          />
        )}
      </div>
    </Card>
  );
}
