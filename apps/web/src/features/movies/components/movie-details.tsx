import { Trans } from "@lingui/react/macro";
import type { TMDBMovieDetails } from "@seedarr/sdk";

import { MediaExternalLinks } from "@/features/media/components/media-external-links";

interface MovieDetailsProps {
  movie: TMDBMovieDetails;
}

const formatCurrency = (amount?: number) => {
  if (!amount) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
};

export function MovieDetails({ movie }: MovieDetailsProps) {
  const hasAnyDetails =
    movie.status ||
    (movie.budget && movie.budget > 0) ||
    (movie.revenue && movie.revenue > 0) ||
    (movie.production_companies && movie.production_companies.length > 0);

  if (!hasAnyDetails) return null;

  return (
    <dl className="dark text-foreground space-y-4">
      {!!movie.status && (
        <div>
          <dt className="text-sm text-popover-foreground font-medium mb-1">
            <Trans>Status</Trans>
          </dt>
          <dd className="font-semibold">{movie.status}</dd>
        </div>
      )}

      {!!movie.budget && movie.budget > 0 && (
        <div>
          <dt className="text-sm text-popover-foreground font-medium mb-1">
            <Trans>Budget</Trans>
          </dt>
          <dd className="font-semibold">{formatCurrency(movie.budget)}</dd>
        </div>
      )}

      {!!movie.revenue && movie.revenue > 0 && (
        <div>
          <dt className="text-sm text-popover-foreground font-medium mb-1">
            <Trans>Revenue</Trans>
          </dt>
          <dd className="font-semibold">{formatCurrency(movie.revenue)}</dd>
        </div>
      )}

      {!!movie.production_companies && movie.production_companies.length > 0 && (
        <div>
          <dt className="text-sm text-popover-foreground font-medium mb-1">
            <Trans>Production</Trans>
          </dt>
          <dd className="text-sm font-semibold">{movie.production_companies.map((c) => c.name).join(", ")}</dd>
        </div>
      )}
      <MediaExternalLinks type="movie" tmdbId={movie.id} imdbId={movie.external_ids?.imdb_id} />
    </dl>
  );
}
