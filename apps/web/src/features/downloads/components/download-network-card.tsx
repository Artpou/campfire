import { Trans } from "@lingui/react/macro";
import { ArrowDown, ArrowUp, ScaleIcon, Users } from "lucide-react";

import { formatBytes } from "@/shared/helpers/format.helper";
import { Card } from "@/shared/ui/card";

interface DownloadNetworkCardProps {
  type: "download" | "upload" | "peers" | "ratio";
  value?: number;
}

export function DownloadNetworkCard({ type, value = 0 }: DownloadNetworkCardProps) {
  if (type === "download") {
    return (
      <Card className="p-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <ArrowDown className="size-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">
              <Trans>Download Speed</Trans>
            </p>
            <p className="text-lg font-bold">{formatBytes(value)}/s</p>
          </div>
        </div>
      </Card>
    );
  }

  if (type === "upload") {
    return (
      <Card className="p-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue/10">
            <ArrowUp className="size-4 text-blue" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">
              <Trans>Upload Speed</Trans>
            </p>
            <p className="text-lg font-bold">{formatBytes(value)}/s</p>
          </div>
        </div>
      </Card>
    );
  }

  if (type === "ratio") {
    return (
      <Card className="p-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red/10">
            <ScaleIcon className="size-4 text-red" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">
              <Trans>Ratio</Trans>
            </p>
            <p className="text-lg font-bold">{value.toFixed(2)}</p>
          </div>
        </div>
      </Card>
    );
  }

  // peers
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-purple/10">
          <Users className="size-4 text-purple" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">
            <Trans>Connected Peers</Trans>
          </p>
          <p className="text-lg font-bold">{value} peers</p>
        </div>
      </div>
    </Card>
  );
}
