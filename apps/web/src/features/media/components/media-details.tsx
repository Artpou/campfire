import { Trans } from "@lingui/react/macro";
import type { Movie, TV } from "@seedarr/sdk";

import { Label } from "@/shared/ui/label";

import { MediaExternalLinks } from "@/features/media/components/media-external-links";

interface MediaDetailsProps {
  data: Movie | TV;
}

const formatCurrency = (amount?: number) => {
  if (!amount) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
};

export function MediaDetails({ data }: MediaDetailsProps) {
  if ("movie" in data) {
    const { movie } = data;
    const hasAnyDetails =
      movie.status ||
      (movie.budget && movie.budget > 0) ||
      (movie.revenue && movie.revenue > 0) ||
      (movie.production_companies && movie.production_companies.length > 0);

    if (!hasAnyDetails) {
      return <MediaExternalLinks type="movie" tmdbId={movie.id} imdbId={movie.external_ids?.imdb_id} />;
    }

    return (
      <dl className="text-foreground space-y-4">
        {!!movie.status && (
          <div className="space-y-1">
            <Label variant="secondary">
              <Trans>Status</Trans>
            </Label>
            <dd className="font-semibold">{movie.status}</dd>
          </div>
        )}
        {!!movie.budget && movie.budget > 0 && (
          <div className="space-y-1">
            <Label variant="secondary">
              <Trans>Budget</Trans>
            </Label>
            <dd className="font-semibold">{formatCurrency(movie.budget)}</dd>
          </div>
        )}
        {!!movie.revenue && movie.revenue > 0 && (
          <div className="space-y-1">
            <Label variant="secondary">
              <Trans>Revenue</Trans>
            </Label>
            <dd className="font-semibold">{formatCurrency(movie.revenue)}</dd>
          </div>
        )}
        <MediaExternalLinks type="movie" tmdbId={movie.id} imdbId={movie.external_ids?.imdb_id} />
      </dl>
    );
  }

  const { tv } = data;
  const hasAnyDetails =
    tv.status ||
    (tv.networks && tv.networks.length > 0) ||
    (tv.created_by && tv.created_by.length > 0) ||
    (tv.production_companies && tv.production_companies.length > 0);

  if (!hasAnyDetails) {
    return <MediaExternalLinks type="tv" tmdbId={tv.id} imdbId={tv.external_ids?.imdb_id} />;
  }

  return (
    <dl className="space-y-4">
      {!!tv.status && (
        <div>
          <dt className="text-sm text-muted-foreground font-medium mb-1">
            <Trans>Status</Trans>
          </dt>
          <dd className="font-semibold">{tv.status}</dd>
        </div>
      )}
      {!!tv.networks && tv.networks.length > 0 && (
        <div>
          <dt className="text-sm text-muted-foreground font-medium mb-1">
            <Trans>Networks</Trans>
          </dt>
          <dd className="text-sm font-semibold">{tv.networks.map((n) => n.name).join(", ")}</dd>
        </div>
      )}
      {!!tv.created_by && tv.created_by.length > 0 && (
        <div>
          <dt className="text-sm text-muted-foreground font-medium mb-1">
            <Trans>Created by</Trans>
          </dt>
          <dd className="text-sm font-semibold">{tv.created_by.map((c) => c.name).join(", ")}</dd>
        </div>
      )}
      <MediaExternalLinks type="tv" tmdbId={tv.id} imdbId={tv.external_ids?.imdb_id} />
    </dl>
  );
}
