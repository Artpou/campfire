import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Plyr } from "plyr-react";
import "plyr-react/plyr.css";
import { useEffect, useMemo, useRef, useState } from "react";

import { SubtitlesIcon } from "lucide-react";

import { getBaseUrl } from "@/lib/api";
import { AppBreadcrumb } from "@/shared/components/app-breadcrumb";
import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { detectLanguage } from "@/shared/helpers/lang.helper";
import { Button } from "@/shared/ui/button";
import { Container } from "@/shared/ui/container";

import { useAuth } from "@/features/auth/auth-store";
import { SubtitleSearchDialog } from "@/features/subtitles/components/subtitle-search-dialog";
import { useExternalSubtitles } from "@/features/subtitles/hooks/use-subtitles";
import { useTorrentDownload } from "@/features/torrent/hooks/use-torrent-download";
import { useTorrentLink } from "@/features/torrent/hooks/use-torrent-link";

export const Route = createFileRoute("/_app/downloads/$id/play")({
  component: VideoPlayerPage,
});

function VideoPlayerPage() {
  const { id } = Route.useParams();
  const { data: torrent, isLoading } = useTorrentDownload(id);
  const videoUrl = useTorrentLink(id);
  const { user } = useAuth();
  const { data: externalSubtitles } = useExternalSubtitles(id);
  const [subtitleDialogOpen, setSubtitleDialogOpen] = useState(false);

  const playerRef = useRef(null);

  useEffect(() => {
    const progress = torrent?.live?.progress;
    const bufferBar = document.querySelector(".plyr__progress--buffer") as HTMLElement;

    if (bufferBar && typeof progress === "number") {
      bufferBar.style.width = `${progress * 100}%`;
    }
  }, [torrent?.live?.progress]);

  // Build subtitle tracks from torrent files + external (SUBDL) subtitles
  const subtitleTracks = useMemo(() => {
    const tracks: {
      kind: "captions";
      label: string;
      srclang: string;
      src: string;
      default: boolean;
    }[] = [];
    const session = user?.sessionToken;

    if (torrent?.live?.files) {
      const videoExtensions = /\.(mp4|mkv|avi|mov|webm|flv|wmv|m4v)$/i;
      const videoFiles = torrent.live.files.filter((file) => videoExtensions.test(file.name));
      if (videoFiles.length > 0) {
        const largestVideo = videoFiles.sort((a, b) => b.length - a.length)[0];
        const videoBaseName = largestVideo.name.replace(/\.[^.]+$/, "");

        const subtitleFiles = torrent.live.files.filter((file) => {
          const fileName = file.name.toLowerCase();
          if (!fileName.endsWith(".srt") && !fileName.endsWith(".vtt")) return false;
          const fileBaseName = file.name.replace(/\.[^.]+$/, "");
          return (
            fileBaseName.startsWith(videoBaseName) ||
            file.path.includes(largestVideo.path.split("/")[0])
          );
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
            src: `${getBaseUrl()}/downloads/${id}/subtitles/${encodeURIComponent(file.path)}?session=${session}`,
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
        src: `${getBaseUrl()}/downloads/${id}/subtitles/${encodeURIComponent(filePath)}?session=${session}`,
        default: tracks.length === 0,
      });
    }

    if (tracks.length > 0 && !tracks.some((t) => t.default)) {
      tracks[0].default = true;
    }
    return tracks;
  }, [torrent, id, user?.sessionToken, externalSubtitles?.paths]);

  if (isLoading) {
    return (
      <Container>
        <SeedarrLoader />
      </Container>
    );
  }

  if (!torrent) {
    return (
      <Container>
        <div className="text-center py-10">
          <p className="text-muted-foreground">
            <Trans>Download not found</Trans>
          </p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="max-w-7xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <AppBreadcrumb
            items={[
              { name: "Downloads", link: "/downloads" },
              { name: torrent.name, link: `/downloads/${id}` },
              { name: "Play" },
            ]}
          />
          {torrent.mediaId != null && (
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
            tmdbId={String(torrent.mediaId ?? "")}
            downloadId={id}
            mediaTitle={torrent.name}
          />
        )}

        {/* Video Player */}
        <div
          className="w-full bg-black rounded-lg overflow-hidden"
          style={
            {
              "--plyr-color-main": "var(--primary)",
              "--torrent-progress": `${torrent?.live?.progress === 1 ? 0 : (torrent?.live?.progress || 0) * 100 + 2}%`,
            } as React.CSSProperties
          }
        >
          <Plyr
            ref={playerRef}
            crossOrigin="anonymous"
            source={{
              type: "video",
              sources: [
                {
                  src: videoUrl,
                  type: "video/mp4",
                },
              ],
              tracks: subtitleTracks,
            }}
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

        {/* Custom CSS to make Plyr subtitle menu scrollable */}
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
