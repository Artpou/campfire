import { useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";

import { useRole } from "@/features/auth/hooks/use-role";
import { ManualSyncWizard } from "@/features/downloads/components/manual-sync-wizard";
import { useRemoteSync } from "@/features/settings/hooks/remote-sync.queries";
import { settingsQueries } from "@/features/settings/hooks/settings.queries";
import { storageConfigQueries } from "@/features/settings/hooks/storage-config.queries";

interface SyncError {
  name: string;
  path: string;
  type: "movie" | "tv";
}

export function DownloadButtonSynchronize() {
  const { t } = useLingui();
  const { isAdmin } = useRole();
  const [unmatchedFiles, setUnmatchedFiles] = useState<SyncError[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);

  const { data: storageEnabled } = useQuery({
    ...storageConfigQueries.enabled(),
    enabled: isAdmin,
  });
  const { data: tmdbKeyStatus } = useQuery({
    ...settingsQueries.tmdbKeyStatus(),
    enabled: isAdmin,
  });
  const syncMutation = useRemoteSync((files) => {
    setUnmatchedFiles(files);
    setWizardOpen(true);
  });

  if (!isAdmin || !storageEnabled?.enabled) return null;

  const handleSync = () => {
    if (!tmdbKeyStatus?.configured) {
      toast.error(t`TMDB API key is required for synchronization. Configure it in Settings > General.`);
      return;
    }
    syncMutation.mutate();
  };

  return (
    <>
      <Button variant="secondary" size="lg" onClick={handleSync} loading={syncMutation.isPending} icon={RefreshCwIcon}>
        <Trans>Synchronize</Trans>
      </Button>
      <ManualSyncWizard files={unmatchedFiles} open={wizardOpen} onOpenChange={setWizardOpen} />
    </>
  );
}
