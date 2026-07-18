import { Trans } from "@lingui/react/macro";
import type { Download } from "@seedarr/sdk";
import { UploadIcon } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Progress } from "@/shared/ui/progress";

interface DownloadTransferProgressProps {
  download: Download;
}

export function DownloadTransferProgress({ download }: DownloadTransferProgressProps) {
  const progress = download.torrent?.transferProgress;
  const hasProgress = typeof progress === "number";

  if (!hasProgress) return null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-blue-500">{(progress * 100).toFixed(1)}%</span>
          <Badge variant="secondary" className="flex items-center gap-1">
            <UploadIcon className="size-3" />
            <Trans>Transferring</Trans>
          </Badge>
        </div>
      </div>
      <Progress value={progress * 100} variant="transfer" className="mt-2" />
    </div>
  );
}
