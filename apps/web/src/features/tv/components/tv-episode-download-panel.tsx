import { Trans } from "@lingui/react/macro";
import type { Download } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { HardDriveIcon, ServerIcon } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import { DownloadFilesList } from "@/features/downloads/components/download-files-list";
import { DownloadProgress } from "@/features/downloads/components/download-progress";
import { DownloadNetworkCard } from "@/features/downloads/components/network/download-network-card";
import { DownloadNetworkChart } from "@/features/downloads/components/network/download-network-chart";
import { getDownloadStatus, getTorrentFiles } from "@/features/downloads/helpers/downloads.helper";
import { downloadQueries } from "@/features/downloads/hooks/download.queries";

interface TvEpisodeDownloadPanelProps {
  download: Download;
}

export function TvEpisodeDownloadPanel({ download }: TvEpisodeDownloadPanelProps) {
  const { data: remoteFiles, isLoading: isRemoteFilesLoading } = useQuery({
    ...downloadQueries.remoteFiles(download.id),
    enabled: Boolean(download.remoteLocation),
  });

  const status = getDownloadStatus(download);
  const torrentFiles = getTorrentFiles(download);
  const hasTorrentFiles = torrentFiles.length > 0;
  const hasRemoteLocation = Boolean(download.remoteLocation);
  const { downloadSpeed, uploadSpeed, numPeers } = download.torrent ?? {};

  const isDownloading = Boolean(download.torrent && (!download.torrent.done || download.torrent.transferring));
  const showSeedStats = Boolean(download.torrent?.done && !download.torrent.transferring);

  const seedStats = showSeedStats ? (
    <div className="flex gap-2 flex-wrap">
      <DownloadNetworkCard type="upload" value={uploadSpeed} />
      <DownloadNetworkCard type="peers" value={numPeers} />
    </div>
  ) : null;

  const filesContent = (
    <>
      {hasTorrentFiles && hasRemoteLocation ? (
        <Tabs defaultValue="local">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
            <TabsList>
              <TabsTrigger value="local">
                <HardDriveIcon className="size-4" />
                <Trans>Local</Trans>
              </TabsTrigger>
              <TabsTrigger value="remote">
                <ServerIcon className="size-4" />
                <Trans>Remote</Trans>
              </TabsTrigger>
            </TabsList>
            {seedStats}
          </div>
          <TabsContent value="local">
            <DownloadFilesList files={torrentFiles} />
          </TabsContent>
          <TabsContent value="remote">
            {remoteFiles ? (
              <DownloadFilesList files={remoteFiles} />
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                <Trans>Loading remote files…</Trans>
              </p>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-2">
          {seedStats}
          {!hasTorrentFiles && hasRemoteLocation ? (
            remoteFiles ? (
              <DownloadFilesList files={remoteFiles} />
            ) : isRemoteFilesLoading ? (
              <p className="text-sm text-muted-foreground py-4">
                <Trans>Loading remote files…</Trans>
              </p>
            ) : null
          ) : hasTorrentFiles ? (
            <DownloadFilesList files={torrentFiles} />
          ) : null}
        </div>
      )}
    </>
  );

  return (
    <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
      {download.error && (
        <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-sm text-destructive">{download.error}</p>
        </div>
      )}

      {isDownloading ? (
        <div className="space-y-3">
          <DownloadProgress download={download} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <DownloadNetworkChart download={download} />

              <div className="grid grid-cols-2 gap-2">
                {status !== "completed" && <DownloadNetworkCard type="download" value={downloadSpeed} />}
                <DownloadNetworkCard type="upload" value={uploadSpeed} />
                <DownloadNetworkCard type="peers" value={numPeers} />
                <DownloadNetworkCard
                  type="ratio"
                  value={(download.torrent?.uploaded ?? 0) / (download.torrent?.downloaded || 1)}
                />
              </div>
            </div>

            <div>{filesContent}</div>
          </div>
        </div>
      ) : (
        filesContent
      )}
    </div>
  );
}
