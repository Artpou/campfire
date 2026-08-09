import { Trans, useLingui } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { useNavigate } from "@tanstack/react-router";
import { PlayIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";

import { getRemainingTime, getWatchProgressPercent, hasWatchProgress } from "@/features/media/helpers/media.helper";
import { preloadMoviPlayer } from "@/features/player/helpers/movi-player.helper";

interface MediaButtonPlayProps extends ButtonProps {
  media: Media;
  circular?: boolean;
}

export const MediaButtonPlay = ({ media, className, circular = false, ...props }: MediaButtonPlayProps) => {
  const { t } = useLingui();
  const navigate = useNavigate();

  const showWatchProgress = hasWatchProgress(media);
  const watchProgressPercent = getWatchProgressPercent(media);
  const remainingTime = getRemainingTime(media);

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (media.download?.id) navigate({ to: "/downloads/$id/play", params: { id: media.download.id } });
  };

  if (!media.download?.id) return null;

  if (circular) {
    return (
      <button
        type="button"
        className={cn("cursor-pointer", className)}
        onClick={handlePlay}
        onMouseEnter={preloadMoviPlayer}
        onFocus={preloadMoviPlayer}
        onPointerDown={preloadMoviPlayer}
        aria-label={t`Play`}
      >
        <span className="flex items-center justify-center size-16 rounded-full bg-primary/80 shadow-lg opacity-80 group-hover/poster:opacity-100 group-hover/poster:bg-primary group-hover/poster:scale-105 transition-all duration-300">
          <PlayIcon className="size-8 text-white fill-current ml-1" />
        </span>
      </button>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            className={cn(
              "relative overflow-hidden",
              showWatchProgress && "bg-primary/40 hover:bg-primary/60",
              className,
            )}
            onClick={handlePlay}
            onMouseEnter={preloadMoviPlayer}
            onFocus={preloadMoviPlayer}
            onPointerDown={preloadMoviPlayer}
            {...props}
          >
            {showWatchProgress && (
              <div
                className="absolute inset-y-0 left-0 bg-primary transition-all duration-300 pointer-events-none rounded-md"
                style={{ width: `${watchProgressPercent}%` }}
              />
            )}

            <span className="relative z-10 flex items-center justify-center">
              <PlayIcon className="size-3.5 mr-1" />
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
