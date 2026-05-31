import { useState } from "react";

import type { Media } from "@basement/api/types";
import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import {
  ClapperboardIcon,
  ClockPlusIcon,
  FilmIcon,
  HeartIcon,
  MagnetIcon,
  TvIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { CircularProgress } from "@/shared/components/circular-progress";
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
}

export function MediaCard({
  media,
  withType = false,
  hideInfo = false,
  className,
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

      {!hideInfo && (
        <>
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
            <Button className="w-full mt-1" asChild>
              <Link {...torrentsLinkProps}>
                <MagnetIcon />
                <Trans>Torrents</Trans>
              </Link>
            </Button>
          </div>
          {withType && (
            <Button
              variant="outline"
              size="icon"
              className="absolute top-2 left-2 group-hover:hidden"
              aria-label={media.type === "movie" ? "Movie" : "TV"}
            >
              {media.type === "movie" ? <FilmIcon /> : <TvIcon />}
            </Button>
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
              <CircularProgress value={(media.vote_average || 0) * 10} size={52} strokeWidth={5} />
            )}
          </div>
        </>
      )}
    </Card>
  );
}
