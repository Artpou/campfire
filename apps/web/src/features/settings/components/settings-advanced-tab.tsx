import { Trans } from "@lingui/react/macro";
import { getBaseUrl } from "@seedarr/sdk";
import { DownloadIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function SettingsAdvancedTab() {
  const handleExportLogs = () => {
    const url = `${getBaseUrl()}/logs/export`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans>Technical Logs</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>Download the server log file for debugging or support.</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExportLogs}>
            <DownloadIcon className="size-4" />
            <Trans>Export logs</Trans>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
