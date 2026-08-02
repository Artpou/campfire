import { useState } from "react";

import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { HoverCard, HoverCardContent, HoverCardPortal, HoverCardTrigger } from "@radix-ui/react-hover-card";
import type { Media } from "@seedarr/sdk";
import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2Icon, ClapperboardIcon, FilmIcon, InfoIcon, PlayIcon, TvIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

import { DownloadProgress } from "@/features/downloads/components/download-progress";
import { WatchProgressBar } from "@/features/media/components/watch-progress-bar";
import { getPosterUrl, getWatchProgressPercent, hasWatchProgress } from "@/features/media/helpers/media.helper";
import { MediaCardPreview } from "./media-card-preview";

type MediaCardProps = {
  media: Media;
  className?: string;
  mode?: "default" | "minimal" | "preview";
  playable?: boolean;
  withType?: boolean;
  /** Override card click navigation: "detail" (default) or "download". */
  linkTo?: "detail" | "download";
};

export function MediaCard({ media, mode = "default", className, playable, withType, linkTo }: MediaCardProps) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  const canPlay = Boolean(playable || media.download);
  const tmdbLinkProps =
    media.type === "tv"
      ? ({ to: "/tv/$id", params: { id: media.id.toString() } } as const)
      : ({ to: "/movies/$id", params: { id: media.id.toString() } } as const);
  const detailLinkProps =
    linkTo === "download" && media.download?.id
      ? ({ to: "/downloads/$id", params: { id: media.download.id } } as const)
      : tmdbLinkProps;

  const playDownloadId = media.download?.id ?? media.progress?.downloadId ?? undefined;
  const watchProgressPercent = getWatchProgressPercent(media);
  const showWatchProgress = hasWatchProgress(media);

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (playDownloadId && canPlay) navigate({ to: "/downloads/$id/play", params: { id: playDownloadId } });
  };

  if (mode === "minimal") {
    return (
      <div className={cn("relative aspect-2/3", className)}>
        <Card
          className={cn(
            "overflow-hidden relative pt-0 pb-0 w-full",
            showWatchProgress ? "h-[calc(100%-0.75rem)]" : "h-full",
          )}
        >
          <img src={getPosterUrl(media.poster_path, "w342")} alt={media.title} className="size-full object-cover" />
        </Card>
        {showWatchProgress && <WatchProgressBar value={watchProgressPercent} />}
      </div>
    );
  }

  const card = (
    <Link {...detailLinkProps} className="block">
      <div className={cn("relative aspect-2/3", className)}>
        <Card
          className={cn(
            "overflow-hidden relative pt-0 pb-0 border-2 border-transparent transition-colors hover:border-primary w-full",
            showWatchProgress ? "h-[calc(100%-0.75rem)]" : "h-full",
          )}
        >
          {!imgError && !!media.poster_path ? (
            <img
              src={getPosterUrl(media.poster_path, "w342")}
              alt={media.title}
              className="size-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="size-full aspect-square flex items-center justify-center">
              <ClapperboardIcon className="size-10 text-muted-foreground" />
            </div>
          )}

          {mode === "default" &&
            media.download &&
            (!media.download.torrent?.done || media.download.torrent?.transferring) && (
              <div className="absolute top-2 left-2 z-10">
                <DownloadProgress download={media.download} variant="circular" />
              </div>
            )}

          {["search", "preview"].includes(mode) && !!media.download && (
            <Badge variant="secondary" className="absolute top-2 left-2">
              <CheckCircle2Icon className="size-6 " />
              <Trans>Downloaded</Trans>
            </Badge>
          )}

          {withType && (
            <div className="absolute top-2 right-2 flex gap-1">
              <Button variant="outline" size="icon" aria-label={media.type === "movie" ? t`Movie` : t`TV`}>
                {media.type === "movie" ? <FilmIcon /> : <TvIcon />}
              </Button>
            </div>
          )}

          {playable && (
            <div className="absolute top-2 right-2 flex gap-1">
              <Button
                variant="outline"
                size="icon"
                aria-label={t`Details`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate({
                    to: media.type === "tv" ? "/tv/$id" : "/movies/$id",
                    params: { id: media.id.toString() },
                  });
                }}
              >
                <InfoIcon />
              </Button>
            </div>
          )}

          {mode === "default" && !playable && canPlay && (
            <div className="absolute bottom-2 left-2 right-2 z-10 flex gap-1">
              <Button size="sm" className="flex-1" onClick={handlePlay}>
                <PlayIcon className="size-3.5 mr-1" />
                {showWatchProgress ? (
                  <Trans>Resume</Trans>
                ) : media.download?.torrent?.done ? (
                  <Trans>Play</Trans>
                ) : (
                  <Trans>Streaming</Trans>
                )}
              </Button>
            </div>
          )}
        </Card>

        {showWatchProgress && <WatchProgressBar value={watchProgressPercent} />}
      </div>
    </Link>
  );

  if (mode !== "preview") {
    return <div className="relative group">{card}</div>;
  }

  return (
    <HoverCard openDelay={600} closeDelay={100}>
      <HoverCardTrigger asChild>{card}</HoverCardTrigger>

      <HoverCardPortal>
        <HoverCardContent
          className="w-[360px] border-border bg-card p-0 shadow-2xl"
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
