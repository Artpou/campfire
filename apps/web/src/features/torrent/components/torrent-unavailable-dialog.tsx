import { Trans } from "@lingui/react/macro";
import { HardDriveIcon, Loader2Icon, RefreshCwIcon, ServerOffIcon, XIcon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";

interface TorrentUnavailableDialogProps {
  open: boolean;
  onRetry: () => void;
  onCancel: () => void;
  onStoreLocally: () => void;
  isRetrying?: boolean;
  isStoringLocally?: boolean;
}

export function TorrentUnavailableDialog({
  open,
  onRetry,
  onCancel,
  onStoreLocally,
  isRetrying,
  isStoringLocally,
}: TorrentUnavailableDialogProps) {
  const isPending = isRetrying || isStoringLocally;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
              <ServerOffIcon className="size-5 text-destructive" />
            </div>
            <AlertDialogTitle>
              <Trans>Remote server unavailable</Trans>
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            <Trans>
              The remote storage server could not be reached. Choose how you would like to proceed with this download.
            </Trans>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={onRetry}
            disabled={isPending}
            className="w-full"
            icon={isRetrying ? undefined : RefreshCwIcon}
          >
            {isRetrying && <Loader2Icon className="size-4 animate-spin" />}
            <Trans>Retry</Trans>
          </Button>
          <Button
            variant="secondary"
            onClick={onStoreLocally}
            disabled={isPending}
            className="w-full"
            icon={isStoringLocally ? undefined : HardDriveIcon}
          >
            {isStoringLocally && <Loader2Icon className="size-4 animate-spin" />}
            <Trans>Store locally</Trans>
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={isPending} className="w-full" icon={XIcon}>
            <Trans>Cancel</Trans>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
