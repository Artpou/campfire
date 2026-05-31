import { useMemo, useState } from "react";

import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { TvIcon } from "lucide-react";

import { CircularProgress } from "@/shared/components/circular-progress";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";

import { MediaCard } from "@/features/media/components/media-card";
import { useMedia } from "@/features/media/hooks/use-media";
import type { TorrentDownload } from "@/features/torrent/hooks/use-torrent-download";
import { parseSeasonEpisode } from "@/features/tv/helpers/episode.helper";
import { DownloadCard } from "./download-card";

interface DownloadsSeriesGroupCardProps {
  mediaId: number;
  downloads: TorrentDownload[];
  inGrid?: boolean;
}

function summarizeEpisodes(downloads: TorrentDownload[]): {
  episodeCount: number;
  seasons: number[];
} {
  const episodeKeys = new Set<string>();
  const seasonsSet = new Set<number>();
  for (const dl of downloads) {
    const matches = parseSeasonEpisode(dl.name);
    if (matches.length === 0) {
      episodeKeys.add(`unknown-${dl.id}`);
      continue;
    }
    for (const m of matches) {
      seasonsSet.add(m.season);
      if (m.episode !== undefined) {
        episodeKeys.add(`${m.season}-${m.episode}`);
      } else {
        episodeKeys.add(`${m.season}-all`);
      }
    }
  }
  return {
    episodeCount: episodeKeys.size,
    seasons: Array.from(seasonsSet).sort((a, b) => a - b),
  };
}

export function DownloadsSeriesGroupCard({
  mediaId,
  downloads,
  inGrid = false,
}: DownloadsSeriesGroupCardProps) {
  const { data: media } = useMedia(mediaId);
  const [open, setOpen] = useState(false);

  const summary = useMemo(() => summarizeEpisodes(downloads), [downloads]);

  const aggregateProgress = useMemo(() => {
    if (downloads.length === 0) return 0;
    const total = downloads.reduce((acc, dl) => {
      const p = dl.live ? dl.live.progress : dl.status === "completed" ? 1 : 0;
      return acc + p;
    }, 0);
    return total / downloads.length;
  }, [downloads]);

  const hasActive = downloads.some(
    (dl) => dl.status === "downloading" || dl.status === "queued" || dl.status === "paused",
  );
  const isPaused =
    downloads.every((dl) => dl.status === "paused" || dl.status === "completed") &&
    downloads.some((dl) => dl.status === "paused");

  if (!media) return null;

  if (inGrid) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <div className="relative group cursor-pointer">
            <MediaCard media={media} hideInfo className="pointer-events-none" />

            {hasActive && (
              <div className="absolute top-2 right-2">
                <CircularProgress
                  value={aggregateProgress * 100}
                  size={50}
                  strokeWidth={4}
                  showValue
                  noColor
                  paused={isPaused}
                  className={isPaused ? "text-orange-500" : "text-primary"}
                />
              </div>
            )}

            <div className="absolute top-2 left-2 flex flex-col gap-1">
              <Badge className="bg-background/80 text-foreground backdrop-blur-sm border-border">
                <TvIcon className="size-3 mr-1" />
                <Trans>{summary.episodeCount} episodes</Trans>
              </Badge>
              {summary.seasons.length > 0 && (
                <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                  <Trans>{summary.seasons.length} seasons</Trans>
                </Badge>
              )}
            </div>

            <div className="absolute bottom-2 left-2 right-2">
              <Button className="w-full pointer-events-none">
                <Trans>View episodes</Trans>
              </Button>
            </div>
          </div>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col">
          <SheetHeader>
            <SheetTitle>
              <Link to="/tv/$id" params={{ id: media.id.toString() }}>
                {media.title}
              </Link>
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 space-y-3">
            {downloads.map((dl) => (
              <DownloadCard key={dl.id} torrent={dl} />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <div className="flex flex-row items-stretch gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/40">
          <div className="w-[100px] shrink-0">
            <MediaCard media={media} hideInfo />
          </div>
          <div className="flex flex-col justify-between flex-1 min-w-0">
            <div>
              <h3 className="text-lg font-semibold line-clamp-1">{media.title}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge>
                  <TvIcon className="size-3 mr-1" />
                  <Trans>{summary.episodeCount} episodes</Trans>
                </Badge>
                {summary.seasons.length > 0 && (
                  <Badge variant="outline">
                    <Trans>{summary.seasons.length} seasons</Trans>
                  </Badge>
                )}
              </div>
            </div>
            {hasActive && (
              <div className="mt-2">
                <CircularProgress
                  value={aggregateProgress * 100}
                  size={40}
                  strokeWidth={3}
                  showValue
                  noColor
                  paused={isPaused}
                  className={isPaused ? "text-orange-500" : "text-primary"}
                />
              </div>
            )}
          </div>
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle>
            <Link to="/tv/$id" params={{ id: media.id.toString() }}>
              {media.title}
            </Link>
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 space-y-3">
          {downloads.map((dl) => (
            <DownloadCard key={dl.id} torrent={dl} />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
