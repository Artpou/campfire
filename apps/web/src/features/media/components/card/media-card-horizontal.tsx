import { type ReactNode, useMemo } from "react";

import type { Media } from "@seedarr/sdk";
import { Link, type LinkOptions } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { Card } from "@/shared/ui/card";
import { Img } from "@/shared/ui/image";

import { DownloadMetadata } from "@/features/downloads/components/download-metadata";
import { DownloadProgress } from "@/features/downloads/components/download-progress";
import { MediaBadgeDate } from "@/features/media/components/badge/media-badge-date";
import { MediaBadgeRating } from "@/features/media/components/badge/media-badge-rating";
import { MediaSocialActions } from "@/features/media/components/media-social-actions";
import { getBackdropUrl, getPosterUrl } from "@/features/media/helpers/media.helper";

interface MediaCardHorizontalProps {
  media: Media;
  children?: ReactNode;
  className?: string;
  withOverview?: boolean;
  withSocialActions?: boolean;
  withDownload?: boolean;
  link?: LinkOptions;
}

export function MediaCardHorizontal({
  media,
  children,
  className,
  withOverview,
  withSocialActions,
  withDownload,
  link: linkProp,
}: MediaCardHorizontalProps) {
  const backdropUrl = getBackdropUrl(media.backdrop_path ?? null, "w780");
  const isMobile = useIsMobile();

  const link: LinkOptions = useMemo(() => {
    if (linkProp) return linkProp;
    return {
      to: media.download?.id ? "/downloads/$id/play" : media.type === "tv" ? "/tv/$id" : "/movies/$id",
      params: { id: String(media.download?.id ?? media.id) },
    };
  }, [linkProp, media.download?.id, media.id, media.type]);

  const card = (
    <Card
      className={cn(
        "relative pt-0 pb-0 mb-0 overflow-hidden rounded-lg border-2 border-transparent bg-card/60 transition-colors hover:border-primary",
        className,
        withSocialActions && isMobile && "rounded-b-none",
      )}
    >
      <Link {...link} className="absolute inset-0 z-10" />
      {backdropUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{ backgroundImage: `url(${backdropUrl})` }}
        >
          <div className="absolute inset-0 bg-linear-to-r from-background/90 via-background/70 to-background/40" />
        </div>
      )}

      <div className="relative z-20 flex items-stretch gap-3 p-3 md:p-4 pointer-events-none h-full">
        <Img
          src={media.poster_path ? getPosterUrl(media.poster_path ?? null, "w185") : undefined}
          alt={media.title}
          className="size-full object-cover h-fit  w-16 md:w-20 aspect-2/3 rounded-md overflow-hidden border border-border/40 pointer-events-none"
        />

        <div className="flex flex-col justify-between min-w-0 flex-1 py-0.5 gap-2">
          <div className="flex justify-between gap-2">
            <div className="space-y-1 flex-1">
              <h3 className="text-sm md:text-base font-semibold line-clamp-2 leading-snug">{media.title}</h3>
              <div className="flex items-center gap-2">
                <MediaBadgeDate date={media.release_date} yearOnly />
                <MediaBadgeRating media={media} onlyOne />
              </div>
              {withOverview && (
                <p className="md:max-w-[70%] text-sm text-muted-foreground line-clamp-3 leading-snug">
                  {media.overview}
                </p>
              )}
            </div>
            {withSocialActions && !isMobile && (
              <MediaSocialActions media={media} size="lg" className="pointer-events-auto z-30 shrink-0" />
            )}
          </div>

          {children && <div className="pointer-events-auto z-30">{children}</div>}

          {withDownload && media.download && (
            <div className="flex items-center justify-between gap-2 pointer-events-auto z-30">
              <DownloadProgress className="flex-1" download={media.download} size="sm" />
              <DownloadMetadata download={media.download} />
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  if (!isMobile || !withSocialActions) {
    return card;
  }

  return (
    <div className="flex flex-col">
      {card}
      <Card className="p-3 rounded-t-none">
        <MediaSocialActions media={media} size="lg" className="flex-row justify-center w-full" />
      </Card>
    </div>
  );
}
