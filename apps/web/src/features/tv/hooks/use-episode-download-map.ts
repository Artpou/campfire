import { useMemo } from "react";

import type { Download } from "@seedarr/sdk";
import { useQueries } from "@tanstack/react-query";

import { downloadQueries } from "@/features/downloads/hooks/download.queries";
import { buildEpisodeDownloadMap } from "@/features/tv/helpers/episode-downloads.helper";

export function useEpisodeDownloadMap(downloads: Download[]) {
  const remoteDownloads = useMemo(() => downloads.filter((download) => Boolean(download.remoteLocation)), [downloads]);

  return useQueries({
    queries: remoteDownloads.map((download) => downloadQueries.remoteFiles(download.id)),
    combine: (results) => {
      const files = new Map<string, { name: string; path: string }[]>();
      for (const [index, download] of remoteDownloads.entries()) {
        const data = results[index]?.data;
        if (data) files.set(download.id, data);
      }
      return buildEpisodeDownloadMap(downloads, files);
    },
  });
}
