import { Trans } from "@lingui/react/macro";
import type { RequestStatus } from "@seedarr/contracts";

import { Badge } from "@/shared/ui/badge";

interface RequestStatusBadgeProps {
  status: RequestStatus;
}

export function RequestStatusBadge({ status }: RequestStatusBadgeProps) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="secondary">
          <Trans>Pending</Trans>
        </Badge>
      );
    case "validated":
      return (
        <Badge variant="default">
          <Trans>Validated</Trans>
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="destructive">
          <Trans>Cancelled</Trans>
        </Badge>
      );
  }
}
