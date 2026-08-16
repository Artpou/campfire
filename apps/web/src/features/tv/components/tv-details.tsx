import { Trans } from "@lingui/react/macro";
import type { TMDBTvDetails } from "@seedarr/sdk";

import { MediaExternalLinks } from "@/features/media/components/media-external-links";

interface TvDetailsProps {
  tv: TMDBTvDetails;
}

export function TvDetails({ tv }: TvDetailsProps) {
  const hasAnyDetails =
    tv.status ||
    (tv.networks && tv.networks.length > 0) ||
    (tv.created_by && tv.created_by.length > 0) ||
    (tv.production_companies && tv.production_companies.length > 0);

  if (!hasAnyDetails) return null;

  return (
    <dl className="dark text-foreground space-y-4">
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

      {!!tv.production_companies && tv.production_companies.length > 0 && (
        <div>
          <dt className="text-sm text-muted-foreground font-medium mb-1">
            <Trans>Production</Trans>
          </dt>
          <dd className="text-sm font-semibold">{tv.production_companies.map((c) => c.name).join(", ")}</dd>
        </div>
      )}
      <MediaExternalLinks type="tv" tmdbId={tv.id} imdbId={tv.external_ids?.imdb_id} />
    </dl>
  );
}
