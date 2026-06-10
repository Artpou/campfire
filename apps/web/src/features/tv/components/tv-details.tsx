import { Trans } from "@lingui/react/macro";
import type { TMDBTvDetails } from "@seedarr/sdk";
import { ClockPlusIcon, ExternalLinkIcon, HeartIcon } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

interface TvDetailsProps {
  tv: TMDBTvDetails;
  isLiked?: boolean;
  isInWatchList?: boolean;
  onToggleLike?: () => void;
  onToggleWatchList?: () => void;
}

export function TvDetails({ tv, isLiked, isInWatchList, onToggleLike, onToggleWatchList }: TvDetailsProps) {
  const hasAnyDetails =
    tv.status ||
    (tv.networks && tv.networks.length > 0) ||
    (tv.created_by && tv.created_by.length > 0) ||
    (tv.production_companies && tv.production_companies.length > 0);

  if (!hasAnyDetails) return null;

  return (
    <dl className="dark text-foreground space-y-4">
      <div className="flex gap-3">
        <Button size="icon-lg" variant={isLiked ? "default" : "outline"} rounded onClick={onToggleLike}>
          <HeartIcon fill={isLiked ? "currentColor" : "none"} />
        </Button>
        <Button size="icon-lg" variant={isInWatchList ? "default" : "outline"} rounded onClick={onToggleWatchList}>
          <ClockPlusIcon fill={isInWatchList ? "currentColor" : "none"} />
        </Button>
      </div>

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
      <div className="space-x-2">
        {!!tv.external_ids?.imdb_id && (
          <Badge variant="secondary" className="text-md px-2 py-1">
            <a href={`https://www.imdb.com/title/${tv.external_ids.imdb_id}`} target="_blank" rel="noopener noreferrer">
              <div className="flex items-center gap-2">
                <Trans>IMDb</Trans>
                <ExternalLinkIcon className="size-4" />
              </div>
            </a>
          </Badge>
        )}
        <Badge variant="secondary" className="text-md px-2 py-1">
          <a href={`https://www.themoviedb.org/tv/${tv.id}`} target="_blank" rel="noopener noreferrer">
            <div className="flex items-center gap-2">
              <Trans>TMDB</Trans>
              <ExternalLinkIcon className="size-4" />
            </div>
          </a>
        </Badge>
      </div>
    </dl>
  );
}
