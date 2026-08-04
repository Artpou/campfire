import { Trans } from "@lingui/react/macro";
import { formatBytes } from "@seedarr/shared";
import { ArrowDownIcon, ArrowUpIcon, ScaleIcon, UsersIcon } from "lucide-react";

interface DownloadNetworkCardProps {
  type: "download" | "upload" | "peers" | "ratio";
  value?: number;
}

const CONFIG = {
  download: {
    icon: ArrowDownIcon,
    colorClass: "text-primary bg-primary/10",
  },
  upload: {
    icon: ArrowUpIcon,
    colorClass: "text-blue bg-blue/10",
  },
  ratio: {
    icon: ScaleIcon,
    colorClass: "text-red bg-red/10",
  },
  peers: {
    icon: UsersIcon,
    colorClass: "text-purple bg-purple/10",
  },
} as const;

function formatValue(type: DownloadNetworkCardProps["type"], value: number): string {
  if (type === "download" || type === "upload") return `${formatBytes(value)}/s`;
  if (type === "ratio") return value.toFixed(2);
  return value.toString();
}

export function DownloadNetworkCard({ type, value = 0 }: DownloadNetworkCardProps) {
  const { icon: Icon, colorClass } = CONFIG[type];

  return (
    <div className="bg-card flex items-center gap-2 rounded-md border px-2.5 py-1.5">
      <div className={`p-1 rounded-md ${colorClass}`}>
        <Icon className="size-3.5" />
      </div>
      <div className="flex items-baseline justify-between gap-2 w-full">
        <span className="text-xs text-muted-foreground">
          {type === "download" && <Trans>Download</Trans>}
          {type === "upload" && <Trans>Upload</Trans>}
          {type === "peers" && <Trans>Peers</Trans>}
          {type === "ratio" && <Trans>Ratio</Trans>}
        </span>
        <span className="text-sm font-semibold truncate">{formatValue(type, value)}</span>
      </div>
    </div>
  );
}
