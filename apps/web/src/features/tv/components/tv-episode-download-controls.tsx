import type { Download } from "@seedarr/sdk";

import { DownloadProgress } from "@/features/downloads/components/download-progress";

interface TvEpisodeDownloadControlsProps {
  download: Download;
}

export function TvEpisodeDownloadControls({ download }: TvEpisodeDownloadControlsProps) {
  return (
    <div className="pt-1">
      <DownloadProgress download={download} />
    </div>
  );
}
