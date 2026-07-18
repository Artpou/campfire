import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { type APITypes, Plyr } from "plyr-react";
import "plyr-react/plyr.css";
import { useEffect, useMemo, useRef, useState } from "react";

import { api, getBaseUrl, unwrap, withMediaTokenParam } from "@seedarr/sdk";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SubtitlesIcon } from "lucide-react";

import { AppBreadcrumb } from "@/shared/components/app-breadcrumb";
import { SeedarrLoaderContainer } from "@/shared/components/seedarr-loader-container";
import { detectLanguage } from "@/shared/helpers/lang.helper";
import { mediaSessionQueries } from "@/shared/hooks/media-session.queries";
import { Button } from "@/shared/ui/button";
import { Container } from "@/shared/ui/container";

import { getTorrentFiles } from "@/features/downloads/helpers/downloads.helper";
import { SubtitleSearchDialog } from "@/features/subtitles/components/subtitle-search-dialog";
import { subtitleQueries } from "@/features/subtitles/hooks/subtitle.queries";
import { downloadQueries } from "@/features/torrent/hooks/download.queries";

const ROLE_LEVELS = { owner: 4, admin: 3, member: 2, viewer: 1 } as const;

export const Route = createFileRoute("/_app/downloads/$id/play")({
  beforeLoad: ({ context }) => {
    const role = context.user?.role;
    if (!role || ROLE_LEVELS[role] < ROLE_LEVELS.member) {
      throw redirect({ to: "/movies" });
    }
  },
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(downloadQueries.details(params.id)),
      context.queryClient.ensureQueryData(subtitleQueries.external(params.id)),
      context.queryClient.ensureQueryData(mediaSessionQueries.get()),
    ]),
  pendingComponent: () => <SeedarrLoaderContainer />,
  component: VideoPlayerPage,
});

function VideoPlayerPage() {
  const { id } = Route.useParams();
  const { t } = useLingui();
  const { data: download } = useSuspenseQuery(downloadQueries.details(id));
  const { data: externalSubtitles } = useSuspenseQuery(subtitleQueries.external(id));
  const { data: mediaSession } = useSuspenseQuery(mediaSessionQueries.get());

  const videoRef = useRef<APITypes>(null);
  const videoUrl = withMediaTokenParam(`${getBaseUrl()}/downloads/${id}/stream`, mediaSession?.token);

  const [subtitleDialogOpen, setSubtitleDialogOpen] = useState(false);
  const hasInitialSeeked = useRef(false);

  useEffect(() => {
    if (download.torrent?.done) return;

    const updateBufferBar = async (): Promise<void> => {
      const details = await unwrap(api.downloads[":id"].$get({ param: { id } }));
      const bufferBar = document.querySelector(".plyr__progress--buffer") as HTMLElement | null;
      if (bufferBar && typeof details.torrent?.progress === "number") {
        bufferBar.style.width = `${details.torrent.progress * 100}%`;
      }
    };

    const interval = setInterval(() => {
      void updateBufferBar();
    }, 1500);

    return () => clearInterval(interval);
  }, [download.torrent?.done, id]);

  useEffect(() => {
    if (!download?.mediaId) return;

    const patchInterval = setInterval(async () => {
      const plyr = videoRef.current?.plyr;
      if (!plyr || plyr.paused) return;

      await api.media[":id"].progress.$patch({
        param: { id: download?.mediaId?.toString() ?? "" },
        json: { position: Math.floor(plyr.currentTime), duration: Math.floor(plyr.duration), downloadId: id },
      });
    }, 5000);

    return () => {
      clearInterval(patchInterval);
    };
  }, [download?.mediaId, id]);

  const handleVideoReady = async () => {
    if (hasInitialSeeked.current || !download?.mediaId) return;

    const plyr = videoRef.current?.plyr;
    if (!plyr || typeof plyr.currentTime !== "number") return;

    hasInitialSeeked.current = true;

    const media = await unwrap(api.media[":id"].$get({ param: { id: download.mediaId.toString() } }));
    setTimeout(() => {
      if (!media.progress?.position) return;
      plyr.currentTime = media.progress.position;
    }, 500);
  };

  const subtitleTracks = useMemo(() => {
    const tracks: {
      kind: "captions";
      label: string;
      srclang: string;
      src: string;
      default: boolean;
    }[] = [];

    if (download?.torrent?.files) {
      const videoExtensions = /\.(mp4|mkv|avi|mov|webm|flv|wmv|m4v)$/i;
      const torrentFiles = getTorrentFiles(download);
      const videoFiles = torrentFiles.filter((file) => videoExtensions.test(file.name));
      if (videoFiles.length > 0) {
        const largestVideo = videoFiles.sort((a, b) => b.length - a.length)[0];
        const videoBaseName = largestVideo.name.replace(/\.[^.]+$/, "");

        const subtitleFiles = torrentFiles.filter((file) => {
          const fileName = file.name.toLowerCase();
          if (!fileName.endsWith(".srt") && !fileName.endsWith(".vtt")) return false;
          const fileBaseName = file.name.replace(/\.[^.]+$/, "");
          return fileBaseName.startsWith(videoBaseName) || file.path.includes(largestVideo.path.split("/")[0]);
        });

        for (let index = 0; index < subtitleFiles.length; index++) {
          const file = subtitleFiles[index];
          const fileNameOnly = file.name.split("/").pop() || file.name;
          const nameWithoutExt = fileNameOnly.replace(/\.(srt|vtt)$/i, "");
          const match2 = nameWithoutExt.match(/\.([a-z]{2})$/i);
          const match3 = nameWithoutExt.match(/\.([a-z]{3})$/i);
          const justCode2 = nameWithoutExt.match(/^([a-z]{2})$/i);
          const justCode3 = nameWithoutExt.match(/^([a-z]{3})$/i);
          const langInput = (
            match2?.[1] ||
            match3?.[1] ||
            justCode2?.[1] ||
            justCode3?.[1] ||
            nameWithoutExt
          ).toLowerCase();
          const detected = detectLanguage(langInput);
          const label = detected?.name || nameWithoutExt;
          const srclang = detected?.[1] ? `${detected[1]}-${index}` : `en-${index}`;
          tracks.push({
            kind: "captions",
            label: label.slice(0, 20),
            srclang,
            src: withMediaTokenParam(
              `${getBaseUrl()}/downloads/${id}/subtitles/${encodeURIComponent(file.path)}`,
              mediaSession?.token,
            ),
            default: index === 0 && tracks.length === 0,
          });
        }
      }
    }

    const externalPaths = externalSubtitles?.paths ?? [];
    for (let i = 0; i < externalPaths.length; i++) {
      const filePath = externalPaths[i];
      const fileName = filePath.split("/").pop() || filePath;
      const nameWithoutExt = fileName.replace(/\.(srt|vtt)$/i, "");
      const match2 = nameWithoutExt.match(/\.([a-z]{2})$/i);
      const match3 = nameWithoutExt.match(/\.([a-z]{3})$/i);
      const langInput = (match2?.[1] || match3?.[1] || nameWithoutExt).toLowerCase();
      const detected = detectLanguage(langInput);
      const label = detected?.name || nameWithoutExt;
      tracks.push({
        kind: "captions",
        label: label.slice(0, 20),
        srclang: `ext-${i}`,
        src: withMediaTokenParam(
          `${getBaseUrl()}/downloads/${id}/subtitles/${encodeURIComponent(filePath)}`,
          mediaSession?.token,
        ),
        default: tracks.length === 0,
      });
    }

    if (tracks.length > 0 && !tracks.some((t) => t.default)) {
      tracks[0].default = true;
    }
    return tracks;
  }, [download, id, externalSubtitles?.paths, mediaSession?.token]);

  const plyrSource = useMemo(
    () => ({
      type: "video" as const,
      sources: [{ src: videoUrl, type: "video/mp4" }],
      tracks: subtitleTracks,
    }),
    [videoUrl, subtitleTracks],
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
          <Plyr
            crossOrigin="anonymous"
            ref={videoRef}
            onCanPlay={handleVideoReady}
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
