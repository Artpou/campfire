import { Trans } from "@lingui/react/macro";
import { ClockPlus, ExternalLink, Heart } from "lucide-react";
import type { AppendToResponse, MovieDetails as TMDBMovieDetails } from "tmdb-ts";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

interface MovieDetailsProps {
  movie: AppendToResponse<TMDBMovieDetails, "external_ids"[], "movie">;
  isLiked?: boolean;
  isInWatchList?: boolean;
  onToggleLike?: () => void;
  onToggleWatchList?: () => void;
}

const formatCurrency = (amount?: number) => {
  if (!amount) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
};

export function MovieDetails({
  movie,
  isLiked,
  isInWatchList,
  onToggleLike,
  onToggleWatchList,
}: MovieDetailsProps) {
  const hasAnyDetails =
    movie.status ||
    (movie.budget && movie.budget > 0) ||
    (movie.revenue && movie.revenue > 0) ||
    (movie.production_companies && movie.production_companies.length > 0);

  if (!hasAnyDetails) return null;

  return (
    <dl className="dark text-foreground space-y-4">
      <div className="flex gap-3">
        <Button
          size="icon-lg"
          variant={isLiked ? "default" : "outline"}
          rounded
          onClick={onToggleLike}
        >
          <Heart fill={isLiked ? "currentColor" : "none"} />
        </Button>
        <Button
          size="icon-lg"
          variant={isInWatchList ? "default" : "outline"}
          rounded
          onClick={onToggleWatchList}
        >
          <ClockPlus fill={isInWatchList ? "currentColor" : "none"} />
        </Button>
      </div>

      {!!movie.status && (
        <div>
          <dt className="text-sm text-muted-foreground font-medium mb-1">
            <Trans>Status</Trans>
          </dt>
          <dd className="font-semibold">{movie.status}</dd>
        </div>
      )}

      {!!movie.budget && movie.budget > 0 && (
        <div>
          <dt className="text-sm text-muted-foreground font-medium mb-1">
            <Trans>Budget</Trans>
          </dt>
          <dd className="font-semibold">{formatCurrency(movie.budget)}</dd>
        </div>
      )}

      {!!movie.revenue && movie.revenue > 0 && (
        <div>
          <dt className="text-sm text-muted-foreground font-medium mb-1">
            <Trans>Revenue</Trans>
          </dt>
          <dd className="font-semibold">{formatCurrency(movie.revenue)}</dd>
        </div>
      )}

      {!!movie.production_companies && movie.production_companies.length > 0 && (
        <div>
          <dt className="text-sm text-muted-foreground font-medium mb-1">
            <Trans>Production</Trans>
          </dt>
          <dd className="text-sm font-semibold">
            {movie.production_companies.map((c) => c.name).join(", ")}
          </dd>
        </div>
      )}
      <div className="space-x-2">
        {!!movie.external_ids && (
          <Badge variant="secondary" className="text-md px-2 py-1">
            <a
              href={`https://www.imdb.com/title/${movie.external_ids.imdb_id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="flex items-center gap-2">
                <Trans>IMDb</Trans>
                <ExternalLink className="size-4" />
              </div>
            </a>
          </Badge>
        )}
        <Badge variant="secondary" className="text-md px-2 py-1">
          <a
            href={`https://www.themoviedb.org/movie/${movie.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="flex items-center gap-2">
              <Trans>TMDB</Trans>
              <ExternalLink className="size-4" />
            </div>
          </a>
        </Badge>
      </div>
    </dl>
  );
}
