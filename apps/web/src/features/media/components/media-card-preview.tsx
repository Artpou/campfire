import { useEffect, useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { Link, type LinkProps } from "@tanstack/react-router";
import { ClockIcon, MagnetIcon } from "lucide-react";

import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

import { MediaRating } from "@/features/media/components/media-rating";
import { getBackdropUrl, getPosterUrl } from "@/features/media/helpers/media.helper";
import { trailerQueries } from "@/features/media/hooks/trailer.queries";

type MediaCardPreviewProps = {
  media: Media;
  detailLinkProps: LinkProps;
};

function formatRuntime(minutes: number | null | undefined): string | null {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}

function getEndsAt(minutes: number | null | undefined): string | null {
  if (!minutes) return null;
  const end = new Date(Date.now() + minutes * 60_000);
  return end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MediaCardPreview({ media, detailLinkProps }: MediaCardPreviewProps) {
  const locale = useTmdbLocale();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setEnabled(true);
    }, 1000);
  }, []);

  const { data: trailer } = useQuery({
    ...trailerQueries.get(media, locale),
    enabled,
  });

  const year = media.release_date ? new Date(media.release_date).getFullYear() : null;
  const categories = media.categories?.split(", ").filter(Boolean) ?? [];

  return (
    <>
      <Link {...detailLinkProps} className="block">
        <div className="relative aspect-16/8 w-full overflow-hidden bg-muted">
          {trailer?.key ? (
            <iframe
              src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&controls=0&modestbranding=1&rel=0&showinfo=0`}
              className="absolute inset-0 size-full pointer-events-none"
              allow="autoplay; encrypted-media"
              title={trailer.name}
            />
          ) : (
            <img
              src={getBackdropUrl(media.backdrop_path, "w780") || getPosterUrl(media.poster_path, "w500")}
              alt={media.title}
              className="size-full object-cover"
            />
          )}
        </div>
      </Link>

      <div className="p-3 space-y-2">
        <div className="flex items-center gap-8">
          <Link {...detailLinkProps}>
            <h2 className="font-bold">{media.title}</h2>
          </Link>
        </div>

        <div className="flex items-center gap-2 text-xs flex-wrap">
          {!!media.vote_average && media.vote_average > 0 && <MediaRating media={media} size={36} strokeWidth={2} />}
          {year && <Badge variant="outline">{year}</Badge>}
          {formatRuntime(media.duration) && (
            <Badge variant="outline">
              <ClockIcon className="size-3" />
              {formatRuntime(media.duration)}
            </Badge>
          )}
          {getEndsAt(media.duration) && (
            <Badge variant="secondary">
              <Trans>Ends at</Trans> {getEndsAt(media.duration)}
            </Badge>
          )}
          {media.type === "tv" && media.seasons_number && (
            <>
              <span>·</span>
              <span>
                {media.seasons_number} <Trans>season(s)</Trans>
              </span>
            </>
          )}
        </div>

        {categories.length > 0 && (
          <span className="text-sm font-bold text-muted-foreground">{categories.slice(0, 3).join(", ")}</span>
        )}

        {media.overview && <p className="text-sm leading-relaxed line-clamp-3 mt-1">{media.overview}</p>}

        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" className="flex-1" asChild>
            <Link
              {...(media.type === "tv"
                ? ({ to: "/tv/$id/torrents", params: { id: media.id.toString() } } as const)
                : ({ to: "/movies/$id/torrents", params: { id: media.id.toString() } } as const))}
            >
              <MagnetIcon className="size-3.5" />
              <Trans>Torrents</Trans>
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
