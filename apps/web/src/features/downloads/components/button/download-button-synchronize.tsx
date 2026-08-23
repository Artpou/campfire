import { useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import { useIsMobile } from "@/shared/hooks/use-mobile";
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

import { useRole } from "@/features/auth/hooks/use-role";
import { ManualSyncWizard } from "@/features/downloads/components/manual-sync-wizard";
import { useModule, useStorageModule } from "@/features/module/hooks/use-module";
import { useRemoteSync } from "@/features/settings/hooks/remote-sync.queries";

interface SyncError {
  name: string;
  path: string;
  type: "movie" | "tv";
}

export function DownloadButtonSynchronize() {
  const isMobile = useIsMobile();
  const { t } = useLingui();
  const { isAdmin } = useRole();
  const [unmatchedFiles, setUnmatchedFiles] = useState<SyncError[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { isEnabled: storageEnabled } = useStorageModule();
  const { isAvailable: tmdbAvailable } = useModule("tmdb");
  const syncMutation = useRemoteSync((files) => {
    setUnmatchedFiles(files);
    setWizardOpen(true);
  });

  if (!isAdmin || !storageEnabled) return null;

  const handleSync = () => {
    if (!tmdbAvailable) {
      toast.error(t`TMDB API key is required for synchronization. Configure it in Settings > Modules.`);
      return;
    }
    setConfirmOpen(true);
  };

  return (
    <>
      <Button
        variant="secondary"
        size={isMobile ? "icon-lg" : "lg"}
        onClick={handleSync}
        loading={syncMutation.isPending}
        icon={RefreshCwIcon}
      >
        {!isMobile && <Trans>Synchronize</Trans>}
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Synchronize library?</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>
                Seedarr will scan your movie and TV folders on the storage server, match titles with TMDB, and move
                files into organized folders (Title (year) / Season XX). Existing library entries are skipped.
              </Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                syncMutation.mutate();
              }}
              disabled={syncMutation.isPending}
            >
              <Trans>Synchronize</Trans>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ManualSyncWizard files={unmatchedFiles} open={wizardOpen} onOpenChange={setWizardOpen} />
    </>
  );
}
