import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { api, unwrap } from "@seedarr/sdk";
import { formatError } from "@seedarr/shared";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { toast } from "sonner";

import { AppBreadcrumb } from "@/shared/components/app-breadcrumb";
import { SeedarrLoaderContainer } from "@/shared/components/seedarr-loader-container";
import { Container } from "@/shared/ui/container";

import { hasMinRole } from "@/features/auth/helpers/role.helper";
import { type MoviPlayerHandle, MoviPlayerHost } from "@/features/downloads/components/movi-player-host";
import { buildSubtitleTracks } from "@/features/downloads/helpers/subtitle-tracks.helper";
import { SubtitleSearchDialog } from "@/features/subtitles/components/subtitle-search-dialog";
import { subtitleQueries } from "@/features/subtitles/hooks/subtitle.queries";
import { downloadQueries, refetchDownloadInterval } from "@/features/torrent/hooks/download.queries";

export const Route = createFileRoute("/_app/downloads/$id/play")({
  beforeLoad: ({ context }) => {
    if (!hasMinRole(context.user?.role, "member")) {
      throw redirect({ to: "/movies" });
    }
  },
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(downloadQueries.details(params.id)),
      context.queryClient.ensureQueryData(downloadQueries.playbackInfo(params.id)),
      context.queryClient.ensureQueryData(subtitleQueries.external(params.id)),
    ]);
  },
  pendingComponent: () => <SeedarrLoaderContainer />,
  component: VideoPlayerPage,
});

function VideoPlayerPage() {
  const { id } = Route.useParams();
  const { t } = useLingui();
  const queryClient = useQueryClient();

  const { data: download } = useSuspenseQuery({
    ...downloadQueries.details(id),
    refetchInterval: refetchDownloadInterval,
  });
  const { data: playbackInfo } = useSuspenseQuery({
    ...downloadQueries.playbackInfo(id),
    refetchInterval: download.torrent?.done ? false : 3000,
  });
  const { data: externalSubtitles } = useSuspenseQuery(subtitleQueries.external(id));

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
  }, [sourceFingerprint, id, queryClient]);

  // Same-origin relative URL (Vite proxies /streaming in dev) so cookies work with movi-player.
  const streamUrl = useMemo(() => {
    if (playbackInfo.mode === "live") return `/streaming/${id}/live`;
    return `/streaming/${id}/direct`;
  }, [id, playbackInfo.mode]);

  useEffect(() => {
    if (!download?.mediaId) return;

    const saveProgress = async (): Promise<void> => {
      const player = playerRef.current;
      if (!player || typeof player.currentTime !== "number" || !Number.isFinite(player.currentTime)) return;
      if (player.currentTime < 1) return;

      await api.media[":id"].progress.$patch({
        param: { id: String(download.mediaId) },
        json: {
          position: Math.floor(player.currentTime),
          duration: Math.floor(player.duration || playbackInfo.duration || 0),
          downloadId: id,
        },
      });
    };

    const patchInterval = setInterval(() => {
      const player = playerRef.current;
      if (!player || player.paused) return;
      void saveProgress();
    }, 5000);

    return () => {
      clearInterval(patchInterval);
      void saveProgress();
    };
  }, [download?.mediaId, id, playbackInfo.duration]);

  const handlePlayer = useCallback((player: MoviPlayerHandle | null) => {
    playerRef.current = player;
  }, []);

  const handleLoadedMetadata = useCallback(async () => {
    if (hasInitialSeeked.current) return;

    const player = playerRef.current;
    if (!player) return;

    if (!download?.mediaId) {
      hasInitialSeeked.current = true;
      return;
    }

    const media = await unwrap(api.media[":id"].$get({ param: { id: download.mediaId.toString() } }));
    const position = media.progress?.position;
    if (!position || position < 1) {
      hasInitialSeeked.current = true;
      return;
    }

    hasInitialSeeked.current = true;
    player.currentTime = position;
  }, [download?.mediaId]);

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
        <AppBreadcrumb
          items={[
            { name: t(msg`Downloads`), link: "/downloads" },
            { name: download.torrent?.name ?? "", link: `/downloads/${id}` },
            { name: t(msg`Play`) },
          ]}
        />

        {subtitleDialogOpen && (
          <SubtitleSearchDialog
            open={subtitleDialogOpen}
            onOpenChange={setSubtitleDialogOpen}
            tmdbId={String(download.mediaId ?? "")}
            downloadId={id}
            mediaTitle={download.torrent?.name ?? ""}
          />
        )}

        <div className="w-full bg-black rounded-lg overflow-hidden">
          <MoviPlayerHost
            src={streamUrl}
            tracks={subtitleTracks}
            onPlayer={handlePlayer}
            onLoadedMetadata={handleLoadedMetadata}
            onError={handlePlaybackError}
            onAddSubtitles={download.mediaId != null ? () => setSubtitleDialogOpen(true) : undefined}
            enableSubtitleDelay
          />
        </div>
      </div>
    </Container>
  );
}
