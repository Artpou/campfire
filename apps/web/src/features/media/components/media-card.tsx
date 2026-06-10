import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { Media } from "@seedarr/sdk";
import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2Icon, ClapperboardIcon, DownloadIcon, FilmIcon, PauseIcon, PlayIcon, TvIcon } from "lucide-react";
import { AnimatePresence } from "motion/react";

import { cn } from "@/lib/utils";
import { CircularProgress } from "@/shared/components/circular-progress";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

import { getPosterUrl } from "@/features/media/helpers/media.helper";
import { usePauseTorrent, useResumeTorrent } from "@/features/torrent/hooks/use-torrent-download";
import { MediaCardPreview } from "./media-card-preview";

const HOVER_DELAY_MS = 600;

interface MediaCardProps {
  media: Media;
  backdropPath?: string | null;
  withType?: boolean;
  hideInfo?: boolean;
  className?: string;
  resumeMode?: boolean;
}

export function MediaCard({
  media,
  withType = false,
  hideInfo = false,
  className,
  resumeMode = false,
}: MediaCardProps) {
  const navigate = useNavigate();
  const pauseTorrent = usePauseTorrent();
  const resumeTorrent = useResumeTorrent();
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trailerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const detailLinkProps = media.download?.id
    ? ({ to: "/downloads/$id", params: { id: media.download.id } } as const)
    : media.type === "tv"
      ? ({ to: "/tv/$id", params: { id: media.id.toString() } } as const)
      : ({ to: "/movies/$id", params: { id: media.id.toString() } } as const);

  const showWatchProgress = media.progress?.position != null && media.progress.position <= 95;
  const showDownloadProgress =
    media.download?.status === "downloading" ||
    media.download?.status === "paused" ||
    media.download?.status === "queued";
  const playDownloadId = media.download?.id ?? media.progress?.downloadId;

  const progressPercent = media.progress?.position != null ? media.progress.position / media.progress.duration : 0;

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    hoverTimerRef.current = setTimeout(() => {
      setShowPopover(true);
    }, HOVER_DELAY_MS);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setShowPopover(false);
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (trailerTimerRef.current) {
      clearTimeout(trailerTimerRef.current);
      trailerTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current);
    };
  }, []);

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (playDownloadId) {
      navigate({ to: "/downloads/$id/play", params: { id: playDownloadId } });
    }
  };

  const handlePauseResume = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!media.download) return;
    if (media.download.status === "paused") {
      resumeTorrent.mutate(media.download.id);
    } else {
      pauseTorrent.mutate(media.download.id);
    }
  };

  const getCardRect = () => cardRef.current?.getBoundingClientRect() ?? null;

  if (hideInfo) {
    return (
      <Card className={cn("overflow-hidden aspect-2/3 relative pt-0 pb-0", className)}>
        <img src={getPosterUrl(media.poster_path, "w342")} alt={media.title} className="size-full object-cover" />
        {showWatchProgress && (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-muted/60">
            <div className="h-full bg-green-500" style={{ width: `${progressPercent}%` }} />
          </div>
        )}
      </Card>
    );
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover container for preview popover
    <div ref={cardRef} className="relative group" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <Link {...detailLinkProps} className="block">
        <Card
          className={cn(
            "overflow-hidden aspect-2/3 relative pt-0 pb-0 border-2 border-transparent transition-colors",
            isHovered && "border-primary",
            className,
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

          {showWatchProgress && (
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-muted/60 z-10">
              <div className="h-full bg-green-500" style={{ width: `${progressPercent}%` }} />
            </div>
          )}

          {showDownloadProgress && (
            <div className="absolute top-2 left-2 z-10">
              <CircularProgress
                value={progressPercent * 100}
                size={50}
                strokeWidth={4}
                showValue
                noColor
                paused={media.download?.status === "paused"}
                className={media.download?.status === "paused" ? "text-orange-500" : "text-primary"}
              />
            </div>
          )}

          <div className="absolute top-2 left-2 flex gap-1">
            {!showDownloadProgress && withType && (
              <Button variant="outline" size="icon" aria-label={media.type === "movie" ? "Movie" : "TV"}>
                {media.type === "movie" ? <FilmIcon /> : <TvIcon />}
              </Button>
            )}
            {!showDownloadProgress && media.download && (
              <Button variant="outline" size="icon" aria-label="Downloaded" className="text-green-500">
                <CheckCircle2Icon />
              </Button>
            )}
            {!showDownloadProgress && !media.download && media.progress?.downloadId && (
              <Button variant="outline" size="icon" aria-label="Downloading" className="text-yellow-500">
                <DownloadIcon />
              </Button>
            )}
          </div>

          {(playDownloadId || showDownloadProgress) && (
            <div className="absolute bottom-2 left-2 right-2 z-10 flex gap-1">
              {showDownloadProgress && media.download?.status === "paused" ? (
                <Button size="sm" className="flex-1" onClick={handlePauseResume}>
                  <PlayIcon className="size-3.5 mr-1" />
                  Resume
                </Button>
              ) : showDownloadProgress ? (
                <>
                  <Button size="sm" className="flex-1" onClick={handlePlay}>
                    <PlayIcon className="size-3.5 mr-1 fill-current" />
                    Stream
                  </Button>
                  <Button size="sm" variant="outline" onClick={handlePauseResume}>
                    <PauseIcon className="size-3.5" />
                  </Button>
                </>
              ) : playDownloadId ? (
                <Button size="sm" className="flex-1" onClick={handlePlay}>
                  <PlayIcon className="size-3.5 mr-1 fill-current" />
                  Play
                </Button>
              ) : null}
            </div>
          )}
        </Card>
      </Link>

      {createPortal(
        <AnimatePresence>
          {showPopover && (
            <MediaCardPreview
              media={media}
              detailLinkProps={detailLinkProps}
              resumeMode={resumeMode}
              getAnchorRect={getCardRect}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
