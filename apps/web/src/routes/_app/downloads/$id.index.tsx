import { useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { InfoIcon } from "lucide-react";

import { AppBreadcrumb } from "@/shared/components/app-breadcrumb";
import { SeedarrLoaderContainer } from "@/shared/components/seedarr-loader-container";
import { getFlagUrl } from "@/shared/helpers/lang.helper";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Container } from "@/shared/ui/container";

import { DownloadActionButtons } from "@/features/downloads/components/download-action-buttons";
import { DownloadFilesList } from "@/features/downloads/components/download-files-list";
import { DownloadMetadata } from "@/features/downloads/components/download-metadata";
import { DownloadNetworkCard } from "@/features/downloads/components/download-network-card";
import { DownloadNetworkChart } from "@/features/downloads/components/download-network-chart";
import { DownloadProgress } from "@/features/downloads/components/download-progress";
import { getDownloadStatus, getTorrentFiles } from "@/features/downloads/helpers/downloads.helper";
import { MediaCard } from "@/features/media/components/media-card";
import { mediaQueries } from "@/features/media/hooks/media.queries";
import {
  downloadQueries,
  refetchDownloadInterval,
  useDownloadDelete,
  useDownloadPause,
  useDownloadResume,
} from "@/features/torrent/hooks/download.queries";

export const Route = createFileRoute("/_app/downloads/$id/")({
  component: DownloadDetailPage,
  loader: async ({ context, params }) => {
    const download = await context.queryClient.ensureQueryData(downloadQueries.details(params.id));
    if (!download?.mediaId) throw new Error("Media ID not found");

    await context.queryClient.ensureQueryData(mediaQueries.details(download.mediaId));
  },
  pendingComponent: () => <SeedarrLoaderContainer />,
});
function DownloadDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { t } = useLingui();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: download } = useSuspenseQuery({
    ...downloadQueries.details(id),
    refetchInterval: refetchDownloadInterval,
  });

  // biome-ignore lint/style/noNonNullAssertion: mediaId is guaranteed to be not null
  const { data: media } = useSuspenseQuery(mediaQueries.details(download.mediaId!));
  const deleteTorrent = useDownloadDelete();
  const pauseTorrent = useDownloadPause();
  const resumeTorrent = useDownloadResume();

  const status = getDownloadStatus(download);
  const { downloadSpeed, uploadSpeed, numPeers } = download.torrent ?? {};

  const handleDeleteConfirm = async () => {
    await deleteTorrent.mutateAsync(id);
    navigate({ to: "/downloads" });
  };
  const handlePause = async () => await pauseTorrent.mutateAsync(id);
  const handleResume = async () => await resumeTorrent.mutateAsync(id);

  return (
    <Container>
      <AppBreadcrumb items={[{ name: t(msg`Downloads`), link: "/downloads" }, { name: media.title }]} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 overflow-y-auto">
          <Card className="p-5 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center lg:items-start">
              <div className="w-32 shrink-0 space-y-1">
                <MediaCard media={media} mode="minimal" />
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link to={media.type === "tv" ? "/tv/$id" : "/movies/$id"} params={{ id: media.id.toString() }}>
                    <InfoIcon className="size-4" />
                    <Trans>details</Trans>
                  </Link>
                </Button>
              </div>

              <div className="flex flex-col">
                <h2>{media.title}</h2>

                <div className="flex items-center gap-2">
                  {media.original_language && (
                    <img src={getFlagUrl(media.original_language)} alt={media.original_language} className="size-4" />
                  )}
                  <p className="text-sm text-muted-foreground">{media.original_title}</p>
                </div>

                <p className="my-2 text-sm text-popover-foreground">{media.overview}</p>

                <DownloadMetadata origin={download.origin} quality={download.quality} language={download.language} />
              </div>
            </div>

            <div className="lg:hidden">
              <DownloadActionButtons download={download} onDelete={() => setShowDeleteConfirm(true)} isMobile={true} />
            </div>

            {status !== "completed" && (
              <DownloadProgress download={download} onClick={status === "paused" ? handleResume : handlePause} />
            )}

            {download.error && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm text-destructive">{download.error}</p>
              </div>
            )}

            {download.torrent?.files && <DownloadFilesList files={getTorrentFiles(download)} />}
          </Card>
        </div>

        <div className="block space-y-4 overflow-y-auto">
          <div className="hidden lg:block">
            <DownloadActionButtons download={download} onDelete={() => setShowDeleteConfirm(true)} />
          </div>

          <DownloadNetworkChart download={download} />

          <div className="space-y-2">
            {status !== "completed" && <DownloadNetworkCard type="download" value={downloadSpeed} />}
            <DownloadNetworkCard type="upload" value={uploadSpeed} />
            <DownloadNetworkCard type="peers" value={numPeers} />
            <DownloadNetworkCard
              type="ratio"
              value={(download.torrent?.uploaded ?? 0) / (download.torrent?.downloaded ?? 0)}
            />
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Delete Download</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>Are you sure you want to delete this download? This action cannot be undone.</Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trans>Delete</Trans>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Container>
  );
}
