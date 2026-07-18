import { Trans } from "@lingui/react/macro";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";

import { formatSeasonEpisode } from "@/features/tv/helpers/episode.helper";
import type { CoveredEpisode } from "@/features/tv/helpers/episode-downloads.helper";

export type EpisodeDeleteLabel = CoveredEpisode & {
  name?: string;
};

interface TvEpisodeDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  episodes: EpisodeDeleteLabel[];
  isPending?: boolean;
}

export function TvEpisodeDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  episodes,
  isPending,
}: TvEpisodeDeleteDialogProps) {
  const isMultiEpisode = episodes.length > 1;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isMultiEpisode ? <Trans>Delete multiple episodes</Trans> : <Trans>Delete download</Trans>}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {isMultiEpisode ? (
                <p>
                  <Trans>
                    This download contains a full season pack. Deleting it will remove all of the following episodes:
                  </Trans>
                </p>
              ) : (
                <p>
                  <Trans>Are you sure you want to delete this download? This action cannot be undone.</Trans>
                </p>
              )}

              {episodes.length > 0 && (
                <ul className="max-h-48 overflow-y-auto rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                  {episodes.map((episode) => {
                    const code = formatSeasonEpisode(episode.season, episode.episode);
                    return (
                      <li key={`${episode.season}-${episode.episode}`} className="text-foreground">
                        <span className="text-muted-foreground mr-2">{code}</span>
                        {episode.name ?? null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            <Trans>Cancel</Trans>
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Trans>Delete</Trans>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
