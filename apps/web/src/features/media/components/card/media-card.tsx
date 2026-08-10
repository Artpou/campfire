import { HoverCard, HoverCardContent, HoverCardPortal, HoverCardTrigger } from "@radix-ui/react-hover-card";
import type { Media } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ClockPlusIcon, HeartIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";

import { DownloadProgress } from "@/features/downloads/components/download-progress";
import { MediaButtonPlay } from "@/features/media/components/button/media-button-play";
import { MediaImg } from "@/features/media/components/media-image";
import { MediaRating } from "@/features/media/components/media-rating";
import { MediaTypeBadge } from "@/features/media/components/media-type-badge";
import { settingsQueries } from "@/features/settings/hooks/settings.queries";
import { MediaCardPreview } from "./media-card-preview";

type MediaCardProps = {
  media: Media;
  className?: string;
  hideType?: boolean;
  hideButton?: boolean;
  withDownload?: boolean;
  withPreview?: boolean;
};

export function MediaCard({ media, className, hideType, hideButton, withDownload, withPreview }: MediaCardProps) {
  const { data: uiSettings } = useQuery(settingsQueries.ui());
  const showRatings = uiSettings?.showMediaRatings ?? false;

  const detailLinkProps =
    media.type === "tv"
      ? ({ to: "/tv/$id", params: { id: media.id.toString() } } as const)
      : ({ to: "/movies/$id", params: { id: media.id.toString() } } as const);

  const showDownloadProgress =
    withDownload &&
    media.download &&
    (!media.download.torrent?.done || media.download.torrent?.transferring) &&
    !(!media.download.torrent && media.download.remoteLocation);

  const card = (
    <Link {...detailLinkProps} className="block">
      <div className={cn("relative aspect-2/3", className)}>
        <Card className="overflow-hidden relative pt-0 pb-0 border-2 border-transparent transition-colors hover:border-primary size-full">
          <MediaImg media={media} type="poster" />

          {media.download && showDownloadProgress && (
            <div className="absolute top-2 right-2">
              <DownloadProgress download={media.download} variant="circular" />
            </div>
          )}

          <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
            {!hideType && <MediaTypeBadge type={media.type} />}
            {showRatings && <MediaRating media={media} />}
          </div>

          {media.liked && !showDownloadProgress && (
            <Badge className="absolute top-2 right-2" variant="glass">
              <HeartIcon className="fill-primary text-primary shrink-0" />
            </Badge>
          )}

          {media.inWatchList && !showDownloadProgress && (
            <Badge className="absolute top-2 right-2" variant="glass">
              <ClockPlusIcon className="text-primary shrink-0" />
            </Badge>
          )}

          {!hideButton && (
            <div className="absolute bottom-2 left-2 right-2 flex gap-1">
              <MediaButtonPlay media={media} size="sm" className="w-full" />
            </div>
          )}
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
          className="w-[380px] border-border bg-card p-0 shadow-2xl z-10"
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
