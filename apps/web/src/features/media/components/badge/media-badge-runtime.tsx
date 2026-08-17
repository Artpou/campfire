import type { ComponentProps } from "react";

import { Trans } from "@lingui/react/macro";
import { formatRuntime, getEndsAt } from "@seedarr/shared";
import { ClockIcon } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { TooltipWrapper } from "@/shared/ui/tooltip-wrapper";

type BadgeProps = ComponentProps<typeof Badge>;

interface MediaBadgeRuntimeProps extends Omit<BadgeProps, "children"> {
  minutes?: number | null;
  /** Show "Ends at …" on hover (default true). */
  withEndsAt?: boolean;
}

export function MediaBadgeRuntime({
  minutes,
  withEndsAt = true,
  variant = "glass",
  className,
  ...props
}: MediaBadgeRuntimeProps) {
  if (minutes == null || minutes <= 0) return null;

  const endsAt = withEndsAt ? getEndsAt(minutes) : null;

  const badge = (
    <Badge variant={variant} className={className} {...props}>
      <ClockIcon />
      {formatRuntime(minutes)}
    </Badge>
  );

  if (!endsAt) return badge;

  return (
    <TooltipWrapper
      tooltip={
        <>
          <Trans>Ends at</Trans> {endsAt}
        </>
      }
    >
      {badge}
    </TooltipWrapper>
  );
}
