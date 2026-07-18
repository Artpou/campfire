import { Trans } from "@lingui/react/macro";
import type { Download } from "@seedarr/sdk";
import { Link } from "@tanstack/react-router";
import { Loader2Icon, PlayIcon, ServerIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/shared/ui/button";

interface DownloadActionButtonsProps {
  download: Download;
  onDelete: () => void;
  onTransfer?: () => void;
  isTransferring?: boolean;
  isMobile?: boolean;
}

export function DownloadActionButtons({
  download,
  onDelete,
  onTransfer,
  isTransferring = false,
  isMobile = false,
}: DownloadActionButtonsProps) {
  const showTransfer = Boolean(download.torrent?.done && onTransfer);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button variant="destructive" size="lg" onClick={onDelete} className={isMobile ? "" : "lg:w-auto"}>
          <Trash2Icon className="size-5" />
          {isMobile && (
            <span className="ml-2">
              <Trans>Delete</Trans>
            </span>
          )}
        </Button>
        <Button size="lg" asChild className="flex-1">
          <Link to="/downloads/$id/play" params={{ id: download.id }}>
            <PlayIcon className="mr-2 size-5" />
            {download.torrent?.done ? <Trans>Play</Trans> : <Trans>Streaming</Trans>}
          </Link>
        </Button>
      </div>

      {showTransfer && (
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={onTransfer}
          disabled={isTransferring || download.torrent?.transferring}
        >
          {isTransferring || download.torrent?.transferring ? (
            <Loader2Icon className="size-5 animate-spin" />
          ) : (
            <ServerIcon className="size-5" />
          )}
          <Trans>Transfer to server</Trans>
        </Button>
      )}
    </div>
  );
}
