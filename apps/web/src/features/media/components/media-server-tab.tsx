import { useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { Download } from "@seedarr/sdk";
import { formatBytes } from "@seedarr/shared";
import { useQuery } from "@tanstack/react-query";
import { Trash2Icon } from "lucide-react";

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

import { DownloadFilesList } from "@/features/downloads/components/download-files-list";
import { DownloadMetadata } from "@/features/downloads/components/download-metadata";
import { downloadQueries, useDownloadDelete } from "@/features/downloads/hooks/download.queries";

interface MediaServerTabProps {
  downloads: Download[];
}

export function MediaServerTab({ downloads }: MediaServerTabProps) {
  if (downloads.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        <Trans>No remote files</Trans>
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {downloads.map((dl) => (
        <ServerEntry key={dl.id} download={dl} />
      ))}
    </div>
  );
}

function ServerEntry({ download }: { download: Download }) {
  const { t } = useLingui();
  const deleteTorrent = useDownloadDelete();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: remoteFiles, isLoading } = useQuery({
    ...downloadQueries.remoteFiles(download.id),
    enabled: Boolean(download.remoteLocation),
  });

  const handleDelete = (dbOnly: boolean) => {
    deleteTorrent.mutate({ id: download.id, dbOnly }, { onSuccess: () => setShowDeleteConfirm(false) });
  };

  const metadata = { origin: download.origin, quality: download.quality, language: download.language };
  const totalSize = remoteFiles?.reduce((acc, f) => acc + f.length, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold truncate">
            {download.torrent?.name || download.remoteLocation
              ? download?.remoteLocation?.replace(/\/+$/, "").split("/").pop()
              : download.id}
          </h3>
          {download.remoteLocation && (
            <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{download.remoteLocation}</p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <DownloadMetadata {...metadata} />
            {totalSize > 0 && <span className="text-xs text-muted-foreground">{formatBytes(totalSize)}</span>}
          </div>
        </div>

        <Button
          size="sm"
          variant="destructive"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={deleteTorrent.isPending}
          aria-label={t`Delete`}
        >
          <Trash2Icon className="size-3.5" />
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4">
          <Trans>Loading remote files…</Trans>
        </p>
      ) : remoteFiles && remoteFiles.length > 0 ? (
        <DownloadFilesList files={remoteFiles} {...metadata} />
      ) : null}

      <div className="border-b border-border/50" />

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
              onClick={() => handleDelete(false)}
              disabled={deleteTorrent.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
            >
              <Trans>Delete</Trans>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
