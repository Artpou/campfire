import { Trans } from "@lingui/react/macro";
import type { Module } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { AlertCircleIcon, CheckCircle2Icon, WrenchIcon } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { TooltipWrapper } from "@/shared/ui/tooltip-wrapper";

import { moduleQueries } from "@/features/module/hooks/module.queries";

type ModuleStatusKind = "healthy" | "issue" | "need-config" | "off" | "checking";

function resolveStatus(mod: Module | null, healthOk?: boolean, healthLoading?: boolean): ModuleStatusKind {
  if (!mod) return "off";
  if (mod.configRequired) return "need-config";
  if (!mod.enabled) return "off";
  if (healthLoading) return "checking";
  if (healthOk === true) return "healthy";
  if (healthOk === false) return "issue";
  return "checking";
}

interface ModuleStatusBadgeProps {
  mod: Module | null;
  message?: string;
}

export function ModuleStatusBadge({ mod, message }: ModuleStatusBadgeProps) {
  const health = useQuery({
    ...moduleQueries.health(mod?.id ?? ""),
    enabled: Boolean(mod?.id && mod.enabled && !mod.configRequired),
  });

  const status = resolveStatus(mod, health.data?.ok, health.isLoading || health.isFetching);

  switch (status) {
    case "need-config":
      return (
        <Badge variant="outline" className="bg-warning/10 border-warning text-warning">
          <WrenchIcon />
          <Trans>Need configuration</Trans>
        </Badge>
      );
    case "off":
      return (
        <Badge variant="outline">
          <Trans>Off</Trans>
        </Badge>
      );
    case "checking":
      return (
        <Badge variant="outline">
          <Trans>Checking…</Trans>
        </Badge>
      );
    case "healthy":
      return (
        <Badge variant="success-outline">
          <CheckCircle2Icon />
          <Trans>Healthy</Trans>
        </Badge>
      );
    case "issue":
      return (
        <TooltipWrapper tooltip={message ?? health.data?.message ?? "Unhealthy"}>
          <Badge variant="outline" className="bg-destructive/10 border-destructive text-destructive">
            <AlertCircleIcon />
            <Trans>Issue</Trans>
          </Badge>
        </TooltipWrapper>
      );
  }
}
