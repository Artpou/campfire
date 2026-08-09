import { Trans } from "@lingui/react/macro";
import type { MediaType } from "@seedarr/contracts";
import { ExternalLinkIcon } from "lucide-react";

import { Badge } from "@/shared/ui/badge";

interface MediaExternalLinksProps {
  type: MediaType | "person";
  tmdbId: number;
  imdbId?: string | null;
}

export function MediaExternalLinks({ type, tmdbId, imdbId }: MediaExternalLinksProps) {
  return (
    <div className="space-x-2">
      {!!imdbId && (
        <Badge variant="secondary" className="text-md px-2 py-1">
          <a
            href={type === "person" ? `https://www.imdb.com/name/${imdbId}` : `https://www.imdb.com/title/${imdbId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="flex items-center gap-2">
              <Trans>IMDb</Trans>
              <ExternalLinkIcon className="size-4" />
            </div>
          </a>
        </Badge>
      )}
      <Badge variant="secondary" className="text-md px-2 py-1">
        <a href={`https://www.themoviedb.org/${type}/${tmdbId}`} target="_blank" rel="noopener noreferrer">
          <div className="flex items-center gap-2">
            <Trans>TMDB</Trans>
            <ExternalLinkIcon className="size-4" />
          </div>
        </a>
      </Badge>
    </div>
  );
}
