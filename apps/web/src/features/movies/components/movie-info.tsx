import { Trans } from "@lingui/react/macro";
import type { TMDBMovieDetails } from "@seedarr/sdk";
import { formatRuntime, getEndsAt } from "@seedarr/shared";
import { CalendarIcon, ClockIcon } from "lucide-react";

import { Flag } from "@/shared/components/flag";
import { Badge } from "@/shared/ui/badge";

import { MediaRating } from "@/features/media/components/media-rating";
import { MediaWatchProviders } from "@/features/media/components/media-watch-providers";

interface MovieInfoProps {
  movie: TMDBMovieDetails;
}

export function MovieInfo({ movie }: MovieInfoProps) {
  const endsAt = getEndsAt(movie.runtime);

  return (
    <div className="dark text-foreground flex flex-col gap-4">
      <div>
        <h1 className="md:text-5xl  tracking-tight">{movie.title || movie.original_title || ""}</h1>
        <div className="flex items-center mt-1 gap-2">
          <Flag lang={movie.original_language ?? ""} />
          <p className="text-sm text-muted-foreground font-medium">{movie.original_title}</p>
        </div>

        <div className="flex items-center gap-2.5 text-sm font-medium mt-4">
          {movie.release_date && (
            <Badge variant="outline" className="text-sm px-2.5 py-1 gap-1.5">
              <CalendarIcon className="size-3.5" />
              {new Date(movie.release_date).toLocaleDateString(undefined, {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </Badge>
          )}

          {movie.runtime && (
            <Badge variant="outline" className="text-sm px-2.5 py-1 gap-1.5">
              <ClockIcon className="size-3.5" />
              {formatRuntime(movie.runtime)}
            </Badge>
          )}

          {endsAt && (
            <Badge variant="secondary" className="text-sm px-2.5 py-1 gap-1.5">
              <Trans>Ends at</Trans> {endsAt}
            </Badge>
          )}
        </div>
      </div>

      {(movie.tagline || movie.overview) && (
        <div className="space-y-2">
          {movie.tagline && <p className="text-muted-foreground italic font-bold">{movie.tagline}</p>}
          {movie.overview && <p className="text-sm font-medium leading-relaxed">{movie.overview}</p>}
        </div>
      )}

      <div className="flex items-center gap-4">
        <MediaRating media={movie} />
        <MediaWatchProviders watchProviders={movie["watch/providers"]} mediaName={movie.title ?? ""} />
      </div>
    </div>
  );
}
