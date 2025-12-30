import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { ClockPlusIcon, HeartIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { CircularProgress } from "@/shared/ui/circular-progress";

import { Media } from "@/features/media/media";
import { MovieImage } from "@/features/movies/components/movie-image";

const MAX_TITLE_LENGTH = 30;
const MAX_OVERVIEW_LENGTH = 100;

interface MediaCardProps {
  media: Media;
}

export function MediaCard({ media }: MediaCardProps) {
  const year = media.release_date ? new Date(media.release_date).getFullYear() : "";

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
      <div className="absolute top-2 left-2 right-2 flex justify-between gap-1">
        <div className="flex gap-1">
          {[
            {
              id: "like",
              icon: HeartIcon,
              tooltip: <Trans>Like</Trans>,
              onClick: () => {
                // TODO: Implement like functionality
              },
            },
            {
              id: "watchlist",
              icon: ClockPlusIcon,
              tooltip: <Trans>Add to watch list</Trans>,
              onClick: () => {
                // TODO: Implement add to watch list functionality
              },
            },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="ghost"
                size="icon"
                tooltip={action.tooltip}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 size-8 bg-background/80 hover:bg-background backdrop-blur-sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  action.onClick();
                }}
              >
                <Icon className="size-4" />
              </Button>
            );
          })}
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
