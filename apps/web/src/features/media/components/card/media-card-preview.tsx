import { useEffect, useState } from "react";

import type { Media } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { Link, type LinkProps } from "@tanstack/react-router";

import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Badge } from "@/shared/ui/badge";

import { useRole } from "@/features/auth/hooks/use-role";
import { MediaButtonPlay } from "@/features/media/components/button/media-button-play";
import { MediaButtonRequest } from "@/features/media/components/button/media-button-request";
import { MediaButtonTorrent } from "@/features/media/components/button/media-button-torrent";
import { MediaImg } from "@/features/media/components/media-image";
import { MediaRating } from "@/features/media/components/media-rating";
import { MediaSocialActions } from "@/features/media/components/media-social-actions";
import { trailerQueries } from "@/features/media/hooks/trailer.queries";

type MediaCardPreviewProps = {
  media: Media;
  detailLinkProps: LinkProps;
};

export function MediaCardPreview({ media, detailLinkProps }: MediaCardPreviewProps) {
  const locale = useTmdbLocale();
  const { role } = useRole();
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
            <MediaImg media={media} type="backdrop" />
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
          {!!media.vote_average && media.vote_average > 0 && <MediaRating media={media} />}
          {year && <Badge variant="outline">{year}</Badge>}
        </div>

        {categories.length > 0 && (
          <span className="text-sm font-bold text-muted-foreground">{categories.slice(0, 3).join(", ")}</span>
        )}

        {media.overview && <p className="text-sm leading-relaxed line-clamp-3 mt-1">{media.overview}</p>}

        <MediaSocialActions media={media} className="flex-row justify-between" size="lg" />

        {media.download ? (
          <MediaButtonPlay media={media} className="w-full" />
        ) : role === "viewer" ? (
          <MediaButtonRequest media={media} className="w-full" />
        ) : (
          <MediaButtonTorrent media={media} className="w-full" />
        )}
      </div>
    </>
  );
}
