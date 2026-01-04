import { useEffect, useRef } from "react";

import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";

import { getBaseUrl } from "@/lib/api";
import { AppBreadcrumb } from "@/shared/components/app-breadcrumb";
import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { Container } from "@/shared/ui/container";

import { useTorrentDownload } from "@/features/torrent/hooks/use-torrent-download";

export const Route = createFileRoute("/_app/downloads/$downloadId/play")({
  component: VideoPlayerPage,
});

function VideoPlayerPage() {
  const { downloadId } = Route.useParams();
  const { data: torrent, isLoading } = useTorrentDownload(downloadId);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch video with credentials and set as src
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const videoUrl = `${getBaseUrl()}/torrents/download/${downloadId}/stream`;

    console.log("Loading video from:", videoUrl);

    // Set the URL directly - the browser will handle credentials if the endpoint supports it
    video.src = videoUrl;

    // Add error handler
    const handleError = (e: Event) => {
      console.error("Video error:", e);
      console.error("Video error code:", (e.target as HTMLVideoElement).error);
    };

    const handleLoadStart = () => {
      console.log("Video load started");
    };

    const handleLoadedMetadata = () => {
      console.log("Video metadata loaded");
    };

    video.addEventListener("error", handleError);
    video.addEventListener("loadstart", handleLoadStart);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("error", handleError);
      video.removeEventListener("loadstart", handleLoadStart);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [downloadId]);

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
        <AppBreadcrumb
          items={[
            { name: "Downloads", link: "/downloads" },
            { name: torrent.name, link: `/downloads/${downloadId}` },
            { name: "Play" },
          ]}
        />

        {/* Video Player */}
        <div className="w-full bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            controls
            className="w-full h-auto"
            style={{ maxHeight: "calc(100vh - 200px)" }}
            autoPlay
          >
            <track kind="captions" />
            <Trans>Your browser does not support the video tag.</Trans>
          </video>
        </div>
      </div>
    </Container>
  );
}
