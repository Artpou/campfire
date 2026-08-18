import type { Download } from "@seedarr/sdk";
import { formatBytes } from "@seedarr/shared";

import { cn } from "@/lib/utils";
import { Flag } from "@/shared/components/flag";
import { Badge } from "@/shared/ui/badge";

interface DownloadMetadataProps {
  download: Download;
  className?: string;
}

export function DownloadMetadata({ download, className }: DownloadMetadataProps) {
  const size = download.size ?? download.torrent?.length ?? null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {download.language && <Flag lang={download.language} />}
      {download.quality && (
        <Badge variant="glass" className="text-xs">
          {download.quality}
        </Badge>
      )}
      {download.container && (
        <Badge variant="outline" className="text-xs">
          {download.container}
        </Badge>
      )}
      {size != null && size > 0 && (
        <Badge variant="outline" className="text-xs">
          {formatBytes(size)}
        </Badge>
      )}
      {download.origin && (
        <Badge variant="outline" className="text-xs">
          {download.origin}
        </Badge>
      )}
    </div>
  );
}
