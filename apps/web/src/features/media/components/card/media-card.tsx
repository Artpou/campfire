import type { ReactNode } from "react";

import { HoverCard, HoverCardContent, HoverCardPortal, HoverCardTrigger } from "@radix-ui/react-hover-card";
import type { Media } from "@seedarr/sdk";
import { Link, useNavigate } from "@tanstack/react-router";
import { ClockPlusIcon, HeartIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { handleSafeClick } from "@/shared/helpers/button.helper";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";

import { DownloadProgress } from "@/features/downloads/components/download-progress";
import { MediaButtonPlay } from "@/features/media/components/button/media-button-play";
import { MediaImg } from "@/features/media/components/media-image";
import { MediaRating } from "@/features/media/components/media-rating";
import { MediaTypeBadge } from "@/features/media/components/media-type-badge";
import { MediaCardPreview } from "./media-card-preview";

type MediaCardProps = {
  media: Media;
  className?: string;
  children?: ReactNode;
  showType?: boolean;
  showSocial?: boolean;
  showDownload?: boolean;
  showPlay?: boolean;
  showPreview?: boolean;
};

export function MediaCard({
  media,
  className,
  children,
  showType,
  showSocial,
  showDownload,
  showPlay,
  showPreview,
}: MediaCardProps) {
  const navigate = useNavigate();

  const detailLinkProps =
    media.type === "tv"
      ? ({ to: "/tv/$id", params: { id: media.id.toString() } } as const)
      : ({ to: "/movies/$id", params: { id: media.id.toString() } } as const);

  const showDownloadProgress =
    showDownload &&
    media.download &&
    (!media.download.torrent?.done || media.download.torrent?.transferring) &&
    !(!media.download.torrent && media.download.remoteLocation);

  const card = (
    <Card
      className={cn(
        "relative group overflow-hidden pt-0 pb-0 border-2 border-transparent transition-colors hover:border-primary size-full",
        className,
      )}
    >
      <Link {...detailLinkProps}>
        <MediaImg media={media} type="poster" />

        {media.download && showDownloadProgress && (
          <div className="absolute top-2 right-2">
            <DownloadProgress download={media.download} variant="circular" />
          </div>
        )}

        <div className="absolute top-2 left-2 flex items-center gap-0.5">
          {showType && <MediaTypeBadge type={media.type} iconOnly />}
          {showSocial && <MediaRating media={media} onlyOne />}
        </div>

        {showSocial && media.liked && !showDownloadProgress && (
          <Badge className="absolute top-2 right-2" variant="glass">
            <HeartIcon className="fill-primary text-primary shrink-0" />
          </Badge>
        )}

        {showSocial && media.inWatchList && !media.liked && !showDownloadProgress && (
          <Badge className="absolute top-2 right-2" variant="glass">
            <ClockPlusIcon className="text-primary shrink-0" />
          </Badge>
        )}

        {showPlay && (
          <div className="absolute -bottom-6.5 group-hover:bottom-2 left-2 right-2 flex gap-1 transition-all duration-200 ease-out">
            <MediaButtonPlay media={media} size="sm" className="w-full" />
          </div>
        )}

        {children}
      </Link>
    </Card>
  );

  if (!showPreview) {
    return <div className="relative group">{card}</div>;
  }

  return (
    <HoverCard openDelay={600} closeDelay={100}>
      <HoverCardTrigger asChild>{card}</HoverCardTrigger>

      <HoverCardPortal>
        <HoverCardContent
          className="w-[380px] border-border bg-card p-0 shadow-2xl z-10 cursor-pointer"
          align="center"
          side="top"
          sideOffset={-360}
          collisionPadding={8}
          onWheel={(e) => {
            e.stopPropagation();
            window.scrollBy({ top: e.deltaY, behavior: "auto" });
          }}
          onClick={(e) =>
            handleSafeClick(e, () => navigate({ to: detailLinkProps.to, params: detailLinkProps.params }))
          }
        >
          <MediaCardPreview media={media} detailLinkProps={detailLinkProps} />
        </HoverCardContent>
      </HoverCardPortal>
    </HoverCard>
  );
}
