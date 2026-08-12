import type { ReactNode } from "react";

import type { Media } from "@seedarr/sdk";

import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { Img } from "@/shared/ui/image";

import { MediaRating } from "@/features/media/components/media-rating";
import { getBackdropUrl, getPosterUrl } from "@/features/media/helpers/media.helper";

interface MediaCardHorizontalProps {
  media: Media;
  children?: ReactNode;
  className?: string;
}

export function MediaCardHorizontal({ media, children, className }: MediaCardHorizontalProps) {
  const year = media.release_date ? new Date(media.release_date).getFullYear() : null;
  const backdropUrl = getBackdropUrl(media.backdrop_path ?? null, "w780");

  return (
    <Card
      className={cn(
        "relative pt-0 pb-0 overflow-hidden rounded-lg border-2 border-transparent bg-card/60 transition-colors hover:border-primary",
        className,
      )}
    >
      {backdropUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{ backgroundImage: `url(${backdropUrl})` }}
        >
          <div className="absolute inset-0 bg-linear-to-r from-background/90 via-background/70 to-background/40" />
        </div>
      )}

      <div className="relative z-10 flex items-stretch gap-3 p-3 md:p-4 pointer-events-none">
        <div className="shrink-0 w-16 md:w-20 aspect-2/3 rounded-md overflow-hidden border border-border/40 pointer-events-none">
          <Img
            src={media.poster_path ? getPosterUrl(media.poster_path ?? null, "w185") : undefined}
            alt={media.title}
            className="size-full object-cover"
          />
        </div>

        <div className="flex flex-col justify-between min-w-0 flex-1 py-0.5 gap-2">
          <div className="space-y-0.5">
            <h3 className="text-sm md:text-base font-semibold line-clamp-2 leading-snug">{media.title}</h3>
            <div className="flex items-center gap-2">
              {year != null && <Badge variant="outline">{year}</Badge>}
              <MediaRating media={media} onlyOne />
            </div>
          </div>

          {children && <div className="pointer-events-auto">{children}</div>}
        </div>
      </div>
    </Card>
  );
}
