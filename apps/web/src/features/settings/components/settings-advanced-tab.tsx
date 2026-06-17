import { Trans } from "@lingui/react/macro";
import { getBaseUrl } from "@seedarr/sdk";
import { DownloadIcon, FileIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";

export function SettingsAdvancedTab() {
  const handleExportLogs = () => {
    const url = `${getBaseUrl()}/logs/export`;
    window.open(url, "_blank");
  };

  return (
    <section className="space-y-6">
      <h2>
        <Trans>Advanced</Trans>
      </h2>

      <div className="flex items-center justify-between gap-4 border rounded-md p-4">
        <h3 className="flex items-center gap-3">
          <FileIcon className="size-4" />
          <Trans>Technical Logs</Trans>
        </h3>
        <Button onClick={handleExportLogs}>
          <DownloadIcon className="size-4" />
          <Trans>Export logs</Trans>
        </Button>
      </div>
    </section>
  );
}
