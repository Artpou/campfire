import { Trans } from "@lingui/react/macro";
import type { MediaType } from "@seedarr/contracts";
import { ExternalLinkIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";

interface MediaExternalLinksProps {
  type: MediaType | "person";
  tmdbId: number;
  imdbId?: string | null;
}

export function MediaExternalLinks({ type, tmdbId, imdbId }: MediaExternalLinksProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {type !== "person" && (
        <Button variant="secondary" size="sm" asChild>
          <a href={`https://letterboxd.com/tmdb/${tmdbId}`} target="_blank" rel="noopener noreferrer">
            <img src="/profile/letterboxd.png" alt="" className="size-5 rounded-full" />
            <Trans>Letterboxd</Trans>
            <ExternalLinkIcon className="size-4" />
          </a>
        </Button>
      )}
      {!!imdbId && (
        <Button variant="secondary" size="sm" asChild>
          <a
            href={type === "person" ? `https://www.imdb.com/name/${imdbId}` : `https://www.imdb.com/title/${imdbId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Trans>IMDb</Trans>
            <ExternalLinkIcon className="size-4" />
          </a>
        </Button>
      )}
      <Button variant="secondary" size="sm" asChild>
        <a href={`https://www.themoviedb.org/${type}/${tmdbId}`} target="_blank" rel="noopener noreferrer">
          <Trans>TMDB</Trans>
          <ExternalLinkIcon className="size-4" />
        </a>
      </Button>
    </div>
  );
}
