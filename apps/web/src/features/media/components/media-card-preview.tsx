import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { Link, LinkProps } from "@tanstack/react-router";
import { ClockIcon, ExternalLinkIcon, MagnetIcon, PauseIcon, PlayIcon } from "lucide-react";
import { motion } from "motion/react";

import { CircularProgress } from "@/shared/components/circular-progress";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

import { useAuth } from "@/features/auth/auth-store";
import { DownloadCardProgress } from "@/features/downloads/components/download-card-progress";
import { getBackdropUrl, getPosterUrl } from "@/features/media/helpers/media.helper";
import { useTrailer } from "@/features/media/hooks/use-trailer";
import { usePauseTorrent, useResumeTorrent, useTorrentDownload } from "@/features/torrent/hooks/use-torrent-download";

const PREVIEW_WIDTH = 360;
export const TRAILER_REFETCH_INTERVAL_MS = 1500;

interface MediaCardPreviewProps {
  media: Media;
  detailLinkProps: LinkProps;
  resumeMode?: boolean;
  getAnchorRect: () => DOMRect | null;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function formatRuntime(minutes: number | null | undefined): string | null {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}

function getEndsAt(minutes: number | null | undefined): string | null {
  if (!minutes) return null;
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutes);
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MediaCardPreview({
  media,
  detailLinkProps,
  resumeMode = false,
  getAnchorRect,
  onMouseEnter,
  onMouseLeave,
}: MediaCardPreviewProps) {
  const { user } = useAuth();
  const pauseTorrent = usePauseTorrent();
  const resumeTorrent = useResumeTorrent();

  const { data: trailer } = useTrailer(media.id, media.type);
  const { data: torrentDownload } = useTorrentDownload(media.download?.id || "", { enabled: !!media.download?.id });

  const year = media.release_date ? new Date(media.release_date).getFullYear() : "";
  const torrentsLinkProps =
    media.type === "tv"
      ? ({ to: "/tv/$id/torrents", params: { id: media.id.toString() } } as const)
      : ({ to: "/movies/$id/torrents", params: { id: media.id.toString() } } as const);
  const playLinkProps = media.download?.id
    ? ({ to: "/downloads/$id/play", params: { id: media.download.id } } as const)
    : media.download?.status === "completed"
      ? ({ to: "/downloads/$id/play", params: { id: media.download.id } } as const)
      : null;

  const previewBackdrop = getBackdropUrl(media.backdrop_path, "w780") || getPosterUrl(media.poster_path, "w500");
  const categories = media.categories?.split(", ").filter(Boolean) ?? [];
  const runtime = media.duration;
  const isActiveDownload =
    media.download &&
    (media.download.status === "downloading" ||
      media.download.status === "paused" ||
      media.download.status === "queued");

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

  const rect = getAnchorRect();
  if (!rect) return null;

  const centerX = rect.left + rect.width / 2;
  const left = Math.max(8, Math.min(centerX - PREVIEW_WIDTH / 2, window.innerWidth - PREVIEW_WIDTH - 8));
  const top = rect.top;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed z-9999 shadow-2xl rounded-lg overflow-hidden bg-card border border-border"
      style={{ top, left, width: PREVIEW_WIDTH }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Link {...detailLinkProps} className="block">
        <div className="relative aspect-16/8 w-full overflow-hidden bg-muted">
          {trailer?.key ? (
            <iframe
              src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&showinfo=0`}
              className="absolute inset-0 size-full pointer-events-none"
              allow="autoplay; encrypted-media"
              title={trailer.name}
            />
          ) : (
            <img src={previewBackdrop} alt={media.title} className="size-full object-cover" />
          )}
        </div>
      </Link>

      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Link {...detailLinkProps} className="min-w-0 flex-1">
            <h3 className="font-bold text-base leading-tight hover:underline truncate">{media.title}</h3>
          </Link>
          {media.vote_average != null && media.vote_average > 0 && (
            <CircularProgress value={(media.vote_average || 0) * 10} size={34} strokeWidth={3} className="shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs flex-wrap">
          {year && <Badge variant="outline">{year}</Badge>}

          {formatRuntime(runtime) && (
            <Badge variant="outline">
              <ClockIcon className="size-3" />
              {formatRuntime(runtime)}
            </Badge>
          )}

          {getEndsAt(runtime) && (
            <Badge variant="secondary">
              <Trans>Ends at</Trans> {getEndsAt(runtime)}
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
          <span className="text-xs text-popover-foreground">{categories.slice(0, 3).join(", ")}</span>
        )}

        {media.overview && <p className="text-xs leading-relaxed line-clamp-3 mt-1">{media.overview}</p>}

        {isActiveDownload && media.download && (
          <div className="space-y-2 pt-1">
            <DownloadCardProgress
              progress={torrentDownload?.live?.progress}
              downloadSpeed={torrentDownload?.live?.downloadSpeed}
              uploadSpeed={torrentDownload?.live?.uploadSpeed}
              numPeers={torrentDownload?.live?.numPeers}
            />
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handlePauseResume}
              disabled={pauseTorrent.isPending || resumeTorrent.isPending}
            >
              {torrentDownload?.status === "paused" ? (
                <>
                  <PlayIcon className="size-3.5 mr-1" />
                  <Trans>Resume</Trans>
                </>
              ) : (
                <>
                  <PauseIcon className="size-3.5 mr-1" />
                  <Trans>Pause</Trans>
                </>
              )}
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          {resumeMode && playLinkProps ? (
            <Button size="sm" className="flex-1" asChild>
              <Link {...playLinkProps}>
                <PlayIcon className="size-3.5 fill-current" />
                <Trans>Resume</Trans>
              </Link>
            </Button>
          ) : playLinkProps && torrentDownload?.status === "completed" ? (
            <Button size="sm" className="flex-1" asChild>
              <Link {...playLinkProps}>
                <PlayIcon className="size-3.5 fill-current" />
                <Trans>Play</Trans>
              </Link>
            </Button>
          ) : (
            user?.role !== "viewer" &&
            !isActiveDownload &&
            !media.download && (
              <Button size="sm" className="flex-1" asChild>
                <Link {...torrentsLinkProps}>
                  <MagnetIcon className="size-3.5" />
                  <Trans>Torrents</Trans>
                </Link>
              </Button>
            )
          )}
          {trailer?.key && (
            <Button size="icon" variant="outline" className="shrink-0 size-8" asChild>
              <a
                href={`https://www.youtube.com/watch?v=${trailer.key}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLinkIcon className="size-3.5" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
