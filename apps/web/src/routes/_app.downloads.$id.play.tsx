import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Plyr } from "plyr-react";
import "plyr-react/plyr.css";
import { useEffect, useMemo, useRef } from "react";

import { getBaseUrl } from "@/lib/api";
import { AppBreadcrumb } from "@/shared/components/app-breadcrumb";
import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { detectLanguage } from "@/shared/helpers/lang.helper";
import { Container } from "@/shared/ui/container";

import { useAuth } from "@/features/auth/auth-store";
import { useTorrentDownload } from "@/features/torrent/hooks/use-torrent-download";
import { useTorrentLink } from "@/features/torrent/hooks/use-torrent-link";

export const Route = createFileRoute("/_app/downloads/$id/play")({
  component: VideoPlayerPage,
});

function VideoPlayerPage() {
  const { id } = Route.useParams();
  const { data: torrent, isLoading } = useTorrentDownload(id);
  const videoUrl = useTorrentLink(id);
  // get session from cookies
  const { user } = useAuth();

  const playerRef = useRef(null);

  useEffect(() => {
    const progress = torrent?.live?.progress;
    const bufferBar = document.querySelector(".plyr__progress--buffer") as HTMLElement;
    console.log("bufferBar", bufferBar);

    if (bufferBar && typeof progress === "number") {
      bufferBar.style.width = `${progress * 100}%`;
    }
  }, [torrent?.live?.progress]);

  // Extract subtitle files from torrent
  const subtitleTracks = useMemo(() => {
    if (!torrent?.live?.files) return [];

    // Find the largest video file (same logic as backend)
    const videoExtensions = /\.(mp4|mkv|avi|mov|webm|flv|wmv|m4v)$/i;
    const videoFiles = torrent.live.files.filter((file) => videoExtensions.test(file.name));

    if (videoFiles.length === 0) return [];

    const largestVideo = videoFiles.sort((a, b) => b.length - a.length)[0];
    const videoBaseName = largestVideo.name.replace(/\.[^.]+$/, ""); // Remove extension

    // Find subtitle files that match the video file name
    const subtitleFiles = torrent.live.files.filter((file) => {
      const fileName = file.name.toLowerCase();
      const isSubtitle = fileName.endsWith(".srt") || fileName.endsWith(".vtt");

      if (!isSubtitle) return false;

      // Match subtitles in the same directory or with the same base name
      const fileBaseName = file.name.replace(/\.[^.]+$/, ""); // Remove extension
      return (
        fileBaseName.startsWith(videoBaseName) ||
        file.path.includes(largestVideo.path.split("/")[0])
      );
    });

    return subtitleFiles.map((file, index) => {
      // Get filename without extension
      const fileNameOnly = file.name.split("/").pop() || file.name;
      const nameWithoutExt = fileNameOnly.replace(/\.(srt|vtt)$/i, "");

      // Try to extract language code from filename
      // Patterns: "movie.en.srt", "movie.eng.srt", "en.srt", "eng.srt", "baq.srt", "rum.srt"
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

      // Detect language using the helper
      const detected = detectLanguage(langInput);

      // Use detected language name as label, fallback to filename
      const label = detected?.name || nameWithoutExt;
      // Make srclang unique by appending index if needed
      const srclang = detected?.code ? `${detected.code}-${index}` : `en-${index}`;

      return {
        kind: "captions" as const,
        label: label,
        srclang: srclang,
        // Use /subtitles/ endpoint for automatic SRT to VTT conversion
        src: `${getBaseUrl()}/downloads/${id}/subtitles/${encodeURIComponent(file.path)}?session=${user?.sessionToken}`,
        default: index === 0,
      };
    });
  }, [torrent, id, user?.sessionToken]);

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

  console.log(torrent?.live?.progress);

  return (
    <Container className="max-w-7xl">
      <div className="space-y-4">
        <AppBreadcrumb
          items={[
            { name: "Downloads", link: "/downloads" },
            { name: torrent.name, link: `/downloads/${id}` },
            { name: "Play" },
          ]}
        />

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
            max-height: 400px;
            overflow-y: auto;
          }

          .plyr__menu__container [role="menu"] {
            max-height: 400px;
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
