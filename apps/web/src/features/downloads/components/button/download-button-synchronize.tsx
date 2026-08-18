import { useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import { useIsMobile } from "@/shared/hooks/use-mobile";
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
    syncMutation.mutate();
  };

  return (
    <>
      <Button variant="secondary" size="lg" onClick={handleSync} loading={syncMutation.isPending} icon={RefreshCwIcon}>
        {!isMobile && <Trans>Synchronize</Trans>}
      </Button>
      <ManualSyncWizard files={unmatchedFiles} open={wizardOpen} onOpenChange={setWizardOpen} />
    </>
  );
}
