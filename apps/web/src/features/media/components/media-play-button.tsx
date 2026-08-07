import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LoaderCircleIcon, PlayIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";

import { downloadQueries } from "@/features/downloads/hooks/download.queries";
import { getRemainingTime, getWatchProgressPercent, hasWatchProgress } from "@/features/media/helpers/media.helper";
import { preloadMoviPlayer } from "@/features/player/helpers/movi-player.helper";

interface MediaPlayButtonProps extends ButtonProps {
  media: Media;
}

export const MediaPlayButton = ({ media, className, ...props }: MediaPlayButtonProps) => {
  const navigate = useNavigate();

  const playDownloadId = media.download?.id ?? media.progress?.downloadId ?? undefined;

  const { data: fileStatus, isLoading } = useQuery({
    ...downloadQueries.fileStatus(playDownloadId ?? ""),
    enabled: Boolean(playDownloadId),
  });

  const showWatchProgress = hasWatchProgress(media);
  const watchProgressPercent = getWatchProgressPercent(media);
  const remainingTime = getRemainingTime(media);

  const available = fileStatus?.available ?? false;
  const disabled = !isLoading && !available;

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) {
      toast.error(t`File not available`, { description: t`The download file is no longer accessible.` });
      return;
    }
    if (playDownloadId) navigate({ to: "/downloads/$id/play", params: { id: playDownloadId } });
  };

  if (!playDownloadId) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            className={cn(
              "relative overflow-hidden",
              showWatchProgress && !disabled && "bg-primary/40 hover:bg-primary/60",
              disabled && "opacity-50",
              className,
            )}
            onClick={handlePlay}
            onMouseEnter={preloadMoviPlayer}
            onFocus={preloadMoviPlayer}
            onPointerDown={preloadMoviPlayer}
            disabled={disabled}
            {...props}
          >
            {showWatchProgress && !disabled && (
              <div
                className="absolute inset-y-0 left-0 bg-primary transition-all duration-300 pointer-events-none rounded-md"
                style={{ width: `${watchProgressPercent}%` }}
              />
            )}

            <span className="relative z-10 flex items-center justify-center">
              {isLoading ? (
                <LoaderCircleIcon className="size-3.5 mr-1 animate-spin" />
              ) : (
                <PlayIcon className="size-3.5 mr-1" />
              )}
              {showWatchProgress ? (
                <Trans>Resume</Trans>
              ) : media.download?.torrent?.done || (!media.download?.torrent && media.download?.remoteLocation) ? (
                <Trans>Play</Trans>
              ) : (
                <Trans>Streaming</Trans>
              )}
            </span>
          </Button>
        </TooltipTrigger>

        {remainingTime && (
          <TooltipContent side="top" className="text-xs font-medium">
            {remainingTime}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};
