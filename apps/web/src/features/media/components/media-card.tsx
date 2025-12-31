import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { ClockPlusIcon, FilmIcon, HeartIcon, TvIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { CircularProgress } from "@/shared/ui/circular-progress";

import { useToggleLike, useToggleWatchList } from "@/features/media/hooks/use-media";
import { Media } from "@/features/media/media";
import { MovieImage } from "@/features/movies/components/movie-image";

const MAX_TITLE_LENGTH = 30;
const MAX_OVERVIEW_LENGTH = 100;

interface MediaCardProps {
  media: Media;
  withType?: boolean;
  isLiked?: boolean;
  isInWatchList?: boolean;
}

export function MediaCard({ media, withType = false, isLiked, isInWatchList }: MediaCardProps) {
  const year = media.release_date ? new Date(media.release_date).getFullYear() : "";
  const toggleLike = useToggleLike();
  const toggleWatchList = useToggleWatchList();

  const handleToggleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleLike.mutate(media);
  };

  const handleToggleWatchList = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWatchList.mutate(media);
  };

  const cardContent = (
    <Card className="overflow-hidden aspect-2/3 relative pt-0 pb-0">
      <MovieImage src={media.poster_path || ""} alt={media.title} iconSize={64} />
      <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-background via-background/95 to-background/60 transition-all duration-200 translate-y-full group-hover:translate-y-0 p-3">
        <h3 className="font-semibold text-base">
          {media.title?.slice(0, MAX_TITLE_LENGTH)}
          {media.title?.length > MAX_TITLE_LENGTH ? "..." : ""}
        </h3>
        <p className="text-muted-foreground text-xs">
          {media.overview?.slice(0, MAX_OVERVIEW_LENGTH)}
          {(media.overview?.length || 0) > MAX_OVERVIEW_LENGTH ? "..." : ""}
        </p>
        <p className="text-xs font-bold">{year}</p>
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
          {isLiked !== undefined && (
            <Button
              variant={isLiked ? "default" : "outline"}
              size="icon"
              tooltip={isLiked ? <Trans>Unlike</Trans> : <Trans>Like</Trans>}
              className="sm:opacity-0 group-hover:opacity-100"
              onClick={handleToggleLike}
            >
              <HeartIcon fill={isLiked ? "currentColor" : "none"} />
            </Button>
          )}
          {isInWatchList !== undefined && (
            <Button
              variant={isInWatchList ? "default" : "outline"}
              size="icon"
              tooltip={
                isInWatchList ? (
                  <Trans>Remove from watch list</Trans>
                ) : (
                  <Trans>Add to watch list</Trans>
                )
              }
              className="sm:opacity-0 group-hover:opacity-100"
              onClick={handleToggleWatchList}
            >
              <ClockPlusIcon fill={isInWatchList ? "currentColor" : "none"} />
            </Button>
          )}
        </div>
        {media.vote_average != null && media.vote_average > 0 && (
          <CircularProgress value={(media.vote_average || 0) * 10} size={52} strokeWidth={5} />
        )}
      </div>
    </Card>
  );

  // Only link to movies for now (TV show detail pages not yet implemented)
  if (media.type === "movie") {
    return (
      <Link to="/movies/$movieId" params={{ movieId: media.id.toString() }} className="group">
        {cardContent}
      </Link>
    );
  }

  // TV shows are not clickable yet
  return <div className="group">{cardContent}</div>;
}
