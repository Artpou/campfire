import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { api, getBaseUrl, unwrap, withMediaTokenParam } from "@seedarr/sdk";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import Hls from "hls.js";
import { SubtitlesIcon } from "lucide-react";
import type { APITypes } from "plyr-react";
import { toast } from "sonner";

import { AppBreadcrumb } from "@/shared/components/app-breadcrumb";
import { SeedarrLoaderContainer } from "@/shared/components/seedarr-loader-container";
import { mediaSessionQueries } from "@/shared/hooks/media-session.queries";
import { Button } from "@/shared/ui/button";
import { Container } from "@/shared/ui/container";

import { hasMinRole } from "@/features/auth/helpers/role.helper";
import { buildSubtitleTracks } from "@/features/downloads/helpers/subtitle-tracks.helper";
import { SubtitleSearchDialog } from "@/features/subtitles/components/subtitle-search-dialog";
import { subtitleQueries } from "@/features/subtitles/hooks/subtitle.queries";
import { downloadQueries, refetchDownloadInterval } from "@/features/torrent/hooks/download.queries";

import "plyr-react/plyr.css";

const LazyPlyr = lazy(() => import("plyr-react").then((mod) => ({ default: mod.Plyr })));

export const Route = createFileRoute("/_app/downloads/$id/play")({
  beforeLoad: ({ context }) => {
    if (!hasMinRole(context.user?.role, "member")) {
      throw redirect({ to: "/movies" });
    }
  },
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(downloadQueries.details(params.id)),
      context.queryClient.ensureQueryData(downloadQueries.playbackInfo(params.id)),
      context.queryClient.ensureQueryData(subtitleQueries.external(params.id)),
      context.queryClient.ensureQueryData(mediaSessionQueries.get()),
    ]),
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
  const { data: mediaSession } = useSuspenseQuery(mediaSessionQueries.get());

  const videoRef = useRef<APITypes>(null);
  const hlsRef = useRef<Hls | null>(null);
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
  }, [sourceFingerprint, id, queryClient]);

  const streamUrl = useMemo(() => {
    const mode = playbackInfo.mode;
    if (mode === "hls") {
      const url = `${getBaseUrl()}/streaming/${id}/hls/playlist.m3u8`;
      return withMediaTokenParam(url, mediaSession?.token);
    }
    if (mode === "live") {
      const url = `${getBaseUrl()}/streaming/${id}/live`;
      return withMediaTokenParam(url, mediaSession?.token);
    }
    const url = `${getBaseUrl()}/streaming/${id}/direct`;
    return withMediaTokenParam(url, mediaSession?.token);
  }, [id, playbackInfo.mode, mediaSession?.token]);

  const isHls = playbackInfo.mode === "hls";

  useEffect(() => {
    if (!isHls) return;

    // Wait for Plyr to mount the underlying <video>.
    const tryAttach = (): (() => void) | undefined => {
      const plyr = videoRef.current?.plyr;
      const video = plyr?.media as HTMLVideoElement | undefined;
      if (!video) return undefined;

      // Chrome / Firefox / Edge / Android — MSE via hls.js
      if (Hls.isSupported()) {
        const hls = new Hls({ startLevel: -1 });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal && !errorToastedRef.current) {
            errorToastedRef.current = true;
            toast.error(t(msg`Playback failed`), {
              description: t(msg`HLS stream error: ${data.details}`),
            });
          }
        });

        return () => {
          hls.destroy();
          hlsRef.current = null;
        };
      }

      // Safari iOS / macOS — native HLS (no MSE)
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = streamUrl;
        return () => {
          video.removeAttribute("src");
          video.load();
        };
      }

      if (!errorToastedRef.current) {
        errorToastedRef.current = true;
        toast.error(t(msg`Playback failed`), {
          description: t(msg`This browser does not support HLS playback.`),
        });
      }
      return undefined;
    };

    let cleanup = tryAttach();
    // Plyr may not be ready on first paint — retry briefly.
    const timer = cleanup
      ? undefined
      : setInterval(() => {
          cleanup = tryAttach();
          if (cleanup) clearInterval(timer);
        }, 100);

    return () => {
      if (timer) clearInterval(timer);
      cleanup?.();
    };
  }, [isHls, streamUrl, t]);

  useEffect(() => {
    if (!download?.mediaId) return;

    const saveProgress = async (): Promise<void> => {
      const plyr = videoRef.current?.plyr;
      if (!plyr || typeof plyr.currentTime !== "number" || !Number.isFinite(plyr.currentTime)) return;
      if (plyr.currentTime < 1) return;

      await api.media[":id"].progress.$patch({
        param: { id: String(download.mediaId) },
        json: {
          position: Math.floor(plyr.currentTime),
          duration: Math.floor(plyr.duration ?? playbackInfo.duration ?? 0),
          downloadId: id,
        },
      });
    };

    const patchInterval = setInterval(() => {
      const plyr = videoRef.current?.plyr;
      if (!plyr || plyr.paused) return;
      void saveProgress();
    }, 5000);

    return () => {
      clearInterval(patchInterval);
      void saveProgress();
    };
  }, [download?.mediaId, id, playbackInfo.duration]);

  const handleVideoReady = async () => {
    if (hasInitialSeeked.current) return;

    const plyr = videoRef.current?.plyr;
    if (!plyr || typeof plyr.currentTime !== "number") return;

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
    plyr.currentTime = position;
  };

  const handlePlaybackError = () => {
    if (errorToastedRef.current) return;
    errorToastedRef.current = true;
    toast.error(t(msg`Playback failed`), {
      description: isHls
        ? t(msg`Unsupported codec for the browser (often HEVC/AC3). Try VLC, or use an H.264/AAC file.`)
        : t(msg`Could not load the video stream. Check that the file is still available.`),
    });
  };

  const subtitleTracks = useMemo(
    () => buildSubtitleTracks(download, externalSubtitles?.paths ?? [], mediaSession?.token),
    [download, externalSubtitles?.paths, mediaSession?.token],
  );

  const videoMimeType = useMemo(() => {
    if (isHls) return "application/x-mpegURL";
    if (playbackInfo.mode === "live") return "video/mp4";
    const files = download.torrent?.files ?? [];
    const videos = files.filter((f) => /\.(mp4|mkv|avi|mov|webm|flv|wmv|m4v)$/i.test(f.name));
    const largest = videos.sort((a, b) => b.length - a.length)[0];
    const name = (largest?.name ?? download.torrent?.name ?? "").toLowerCase();
    if (name.endsWith(".webm")) return "video/webm";
    return "video/mp4";
  }, [isHls, playbackInfo.mode, download.torrent?.files, download.torrent?.name]);

  const plyrSource = useMemo(
    () => ({
      type: "video" as const,
      sources: [{ src: isHls ? "" : streamUrl, type: videoMimeType }],
      tracks: subtitleTracks,
    }),
    [isHls, streamUrl, subtitleTracks, videoMimeType],
  );

  return (
    <Container className="max-w-7xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <AppBreadcrumb
            items={[
              { name: t(msg`Downloads`), link: "/downloads" },
              { name: download.torrent?.name ?? "", link: `/downloads/${id}` },
              { name: t(msg`Play`) },
            ]}
          />
          {download.mediaId != null && (
            <Button variant="outline" size="sm" onClick={() => setSubtitleDialogOpen(true)}>
              <SubtitlesIcon className="size-4" />
              <Trans>Add subtitles</Trans>
            </Button>
          )}
        </div>

        {subtitleDialogOpen && (
          <SubtitleSearchDialog
            open={subtitleDialogOpen}
            onOpenChange={setSubtitleDialogOpen}
            tmdbId={String(download.mediaId ?? "")}
            downloadId={id}
            mediaTitle={download.torrent?.name ?? ""}
          />
        )}

        <div
          className="w-full bg-black rounded-lg overflow-hidden"
          style={
            {
              "--plyr-color-main": "var(--primary)",
              "--torrent-progress": `${download.torrent?.progress === 1 ? 0 : (download.torrent?.progress || 0) * 100 + 2}%`,
            } as React.CSSProperties
          }
        >
          <Suspense fallback={<SeedarrLoaderContainer />}>
            <LazyPlyr
              crossOrigin="anonymous"
              ref={videoRef}
              onLoadedMetadata={handleVideoReady}
              onCanPlay={handleVideoReady}
              onError={handlePlaybackError}
              source={plyrSource}
              options={{
                controls: [
                  "play-large",
                  "restart",
                  "rewind",
                  "play",
                  "fast-forward",
                  "progress",
                  "current-time",
                  "duration",
                  "mute",
                  "volume",
                  "captions",
                  "settings",
                  "pip",
                  "airplay",
                  "fullscreen",
                ],
                settings: ["captions", "quality", "speed"],
              }}
            />
          </Suspense>
        </div>

        <style>{`
          .plyr__menu__container {
            max-height: 300px;
            overflow-y: auto;
          }

          .plyr__menu__container [role="menu"] {
            max-height: 300px;
            overflow-y: auto;
          }

          .plyr__captions .plyr__caption {
              font-size: 28px !important; 
              line-height: 1.4 !important;
              background: rgba(0, 0, 0, 0.75) !important;
              border-radius: 4px !important;
              padding: 4px 10px !important;
          }

          @media (max-width: 768px) {
              .plyr__captions .plyr__caption {
                  font-size: 20px !important;
              }
          }

          .plyr__progress__buffer {
            width: var(--torrent-progress) !important;
            transition: width 0.3s ease !important;
            opacity: 1 !important;
            background: rgba(255, 255, 255, 0.2) !important; 
          }
        `}</style>
      </div>
    </Container>
  );
}
