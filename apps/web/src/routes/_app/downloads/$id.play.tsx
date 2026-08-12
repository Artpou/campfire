import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { formatError } from "@seedarr/shared";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { Card } from "@/shared/ui/card";
import { Container } from "@/shared/ui/container";

import { buildSubtitleTracks } from "@/features/downloads/helpers/subtitle-tracks.helper";
import { downloadQueries } from "@/features/downloads/hooks/download.queries";
import { MediaCardHorizontal } from "@/features/media/components/card/media-card-horizontal";
import { hasWatchProgress } from "@/features/media/helpers/media.helper";
import { mediaQueries } from "@/features/media/hooks/media.queries";
import { Player } from "@/features/player/components/player";
import { type MoviPlayerHandle, preloadMoviPlayer } from "@/features/player/helpers/movi-player.helper";
import { SubtitleSearchDialog } from "@/features/subtitles/components/subtitle-search-dialog";
import { subtitleQueries } from "@/features/subtitles/hooks/subtitle.queries";

export const Route = createFileRoute("/_app/downloads/$id/play")({
  loader: async ({ context, params }) => {
    // Start fetching the WASM player chunk while route data loads.
    preloadMoviPlayer();

    const download = await context.queryClient.ensureQueryData(downloadQueries.details(params.id));
    if (!download?.mediaId) throw new Error("Media ID not found");

    await Promise.all([
      context.queryClient.ensureQueryData(downloadQueries.playbackInfo(params.id)),
      context.queryClient.ensureQueryData(subtitleQueries.external(params.id)),
      // Always refetch — ensureQueryData would return stale progress from cache.
      context.queryClient.fetchQuery(mediaQueries.details(download.mediaId)),
    ]);
  },
  component: VideoPlayerPage,
});

function VideoPlayerPage() {
  const { id } = Route.useParams();
  const { t } = useLingui();
  const queryClient = useQueryClient();

  const { data: download } = useSuspenseQuery(downloadQueries.details(id));
  // biome-ignore lint/style/noNonNullAssertion: mediaId is set for playable downloads
  const { data: media } = useSuspenseQuery(mediaQueries.details(download.mediaId!));
  const { data: playbackInfo } = useSuspenseQuery(downloadQueries.playbackInfo(id));
  const { data: externalSubtitles } = useSuspenseQuery(subtitleQueries.external(id));

  const displayName = download.torrent?.name || media.title;

  // Freeze resume position for this session — updating media.progress while watching
  // must not remount the player via startAt.
  const initialResumeRef = useRef<number | null>(null);
  if (initialResumeRef.current === null) {
    initialResumeRef.current = hasWatchProgress(media) ? (media.progress?.position ?? 0) : 0;
  }
  const resumePosition = initialResumeRef.current;

  const playerRef = useRef<MoviPlayerHandle | null>(null);
  const hasInitialSeeked = useRef(false);
  const errorToastedRef = useRef(false);

  const [subtitleDialogOpen, setSubtitleDialogOpen] = useState(false);

  const sourceFingerprint = `${download.remoteLocation ?? "local"}:${download.torrent?.done ? "done" : "active"}`;
  const prevFingerprint = useRef(sourceFingerprint);

  useEffect(() => {
    if (prevFingerprint.current === sourceFingerprint) return;
    prevFingerprint.current = sourceFingerprint;
    void queryClient.invalidateQueries({ queryKey: downloadQueries.playbackInfo(id).queryKey });
    errorToastedRef.current = false;
    hasInitialSeeked.current = false;
    // Recompute startat from media on next render for the new stream source.
    initialResumeRef.current = null;
  }, [sourceFingerprint, id, queryClient]);

  // Same-origin relative URL (Vite proxies /streaming in dev) so cookies work with movi-player.
  const streamUrl = useMemo(() => {
    if (playbackInfo.mode === "live") return `/streaming/${id}/live`;
    return `/streaming/${id}/direct`;
  }, [id, playbackInfo.mode]);

  useEffect(() => {
    if (!download?.mediaId) return;
    const mediaId = download.mediaId;

    const saveProgress = async (): Promise<void> => {
      const player = playerRef.current;
      if (!player || typeof player.currentTime !== "number" || !Number.isFinite(player.currentTime)) return;
      if (player.currentTime < 1) return;

      const position = Math.floor(player.currentTime);
      const duration = Math.floor(player.duration || playbackInfo.duration || 0);

      await unwrap(
        api.media[":id"].progress.$patch({
          param: { id: String(mediaId) },
          json: { position, duration, downloadId: id },
        }),
      );

      queryClient.setQueryData<Media>(mediaQueries.details(mediaId).queryKey, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          progress: {
            position,
            duration,
            downloadId: id,
            completed: duration > 0 && position / duration >= 0.95,
            updatedAt: new Date().toISOString(),
          },
        };
      });
    };

    const patchInterval = setInterval(() => {
      const player = playerRef.current;
      if (!player || player.paused) return;
      void saveProgress();
    }, 5000);

    return () => {
      clearInterval(patchInterval);
      void saveProgress().finally(() => {
        void queryClient.invalidateQueries({ queryKey: mediaQueries.key });
        void queryClient.invalidateQueries({ queryKey: ["movie-full"] });
        void queryClient.invalidateQueries({ queryKey: ["tv"] });
      });
    };
  }, [download?.mediaId, id, playbackInfo.duration, queryClient]);

  const handlePlayer = useCallback((player: MoviPlayerHandle | null) => {
    playerRef.current = player;
  }, []);

  // Fallback if startat wasn't applied — movi-player holds seeks via _pendingSeek until ready.
  const handleLoadedMetadata = useCallback(() => {
    if (hasInitialSeeked.current) return;

    const player = playerRef.current;
    if (!player) return;

    if (!resumePosition) {
      hasInitialSeeked.current = true;
      return;
    }

    hasInitialSeeked.current = true;
    if (player.currentTime < 1) {
      player.currentTime = resumePosition;
    }
  }, [resumePosition]);

  const handlePlaybackError = useCallback(
    (error?: unknown) => {
      if (errorToastedRef.current) return;
      errorToastedRef.current = true;
      const message = error != null ? formatError(error) : undefined;
      toast.error(t(msg`Playback failed`), {
        description: message || t(msg`Could not load the video stream. Check that the file is still available.`),
      });
    },
    [t],
  );

  const subtitleTracks = useMemo(
    () => buildSubtitleTracks(download, externalSubtitles?.paths ?? []),
    [download, externalSubtitles?.paths],
  );

  return (
    <Container className="max-w-7xl">
      <div className="space-y-4">
        {subtitleDialogOpen && (
          <SubtitleSearchDialog
            open={subtitleDialogOpen}
            onOpenChange={setSubtitleDialogOpen}
            tmdbId={String(download.mediaId ?? "")}
            downloadId={id}
            mediaTitle={displayName}
          />
        )}

        <div className="flex justify-center">
          <Card className="w-[70%] pb-0 pt-0 overflow-hidden">
            <Player
              src={streamUrl}
              tracks={subtitleTracks}
              startAt={resumePosition}
              onPlayer={handlePlayer}
              onLoadedMetadata={handleLoadedMetadata}
              onError={handlePlaybackError}
              onAddSubtitles={download.mediaId != null ? () => setSubtitleDialogOpen(true) : undefined}
              enableSubtitleDelay
            />
          </Card>
        </div>

        <MediaCardHorizontal media={media} withOverview withSocialActions withDownload />
      </div>
    </Container>
  );
}
