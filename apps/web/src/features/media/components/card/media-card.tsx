import { Trans } from "@lingui/react/macro";
import { HoverCard, HoverCardContent, HoverCardPortal, HoverCardTrigger } from "@radix-ui/react-hover-card";
import type { Media } from "@seedarr/sdk";
import { Link } from "@tanstack/react-router";
import { ClapperboardIcon, FilmIcon, TvIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { Img } from "@/shared/ui/image";

import { DownloadProgress } from "@/features/downloads/components/download-progress";
import { MediaButtonPlay } from "@/features/media/components/button/media-button-play";
import { getPosterUrl } from "@/features/media/helpers/media.helper";
import { MediaCardPreview } from "./media-card-preview";

type MediaCardProps = {
  media: Media;
  className?: string;
  hideType?: boolean;
  withDownload?: boolean;
  withPreview?: boolean;
};

export function MediaCard({ media, className, hideType, withDownload, withPreview }: MediaCardProps) {
  const detailLinkProps =
    media.type === "tv"
      ? ({ to: "/tv/$id", params: { id: media.id.toString() } } as const)
      : ({ to: "/movies/$id", params: { id: media.id.toString() } } as const);

  const card = (
    <Link {...detailLinkProps} className="block">
      <div className={cn("relative aspect-2/3", className)}>
        <Card className="overflow-hidden relative pt-0 pb-0 border-2 border-transparent transition-colors hover:border-primary size-full">
          <Img
            src={media.poster_path ? getPosterUrl(media.poster_path, "w342") : undefined}
            alt={media.title}
            className="size-full object-cover"
            fallback={<ClapperboardIcon className="size-10 text-muted-foreground" />}
          />

          {withDownload &&
            media.download &&
            (!media.download.torrent?.done || media.download.torrent?.transferring) &&
            !(!media.download.torrent && media.download.remoteLocation) && (
              <div className="absolute top-2 right-2">
                <DownloadProgress download={media.download} variant="circular" />
              </div>
            )}

          {!hideType && (
            <Badge variant="secondary" className="absolute top-2 left-2">
              {media.type === "tv" ? <TvIcon /> : <FilmIcon />}
              <Trans>{media.type === "tv" ? "TV" : "Movie"}</Trans>
            </Badge>
          )}

          <div className="absolute bottom-2 left-2 right-2 flex gap-1">
            <MediaButtonPlay media={media} size="sm" className="w-full" />
          </div>
        </Card>
      </div>
    </Link>
  );

  if (!withPreview) {
    return <div className="relative group">{card}</div>;
  }

  return (
    <HoverCard openDelay={600} closeDelay={100}>
      <HoverCardTrigger asChild>{card}</HoverCardTrigger>

      <HoverCardPortal>
        <HoverCardContent
          className="w-[360px] border-border bg-card p-0 shadow-2xl z-10"
          align="center"
          side="top"
          sideOffset={-360}
          collisionPadding={8}
          onWheel={(e) => {
            e.stopPropagation();
            window.scrollBy({ top: e.deltaY, behavior: "auto" });
          }}
        >
          <MediaCardPreview media={media} detailLinkProps={detailLinkProps} />
        </HoverCardContent>
      </HoverCardPortal>
    </HoverCard>
  );
}
