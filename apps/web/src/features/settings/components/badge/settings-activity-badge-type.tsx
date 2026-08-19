import { Trans } from "@lingui/react/macro";
import type { ActivityType } from "@seedarr/contracts";

import { Badge } from "@/shared/ui/badge";

interface SettingsActivityBadgeTypeProps {
  type: ActivityType;
}

export function SettingsActivityBadgeType({ type }: SettingsActivityBadgeTypeProps) {
  switch (type) {
    case "ERROR":
      return (
        <Badge variant="destructive-outline">
          <Trans>Error</Trans>
        </Badge>
      );
    case "WARNING":
      return (
        <Badge variant="warning-outline">
          <Trans>Warning</Trans>
        </Badge>
      );
    case "SUCCESS":
      return (
        <Badge variant="success-outline">
          <Trans>Success</Trans>
        </Badge>
      );
  }
}
