import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import type { Module } from "@seedarr/sdk";
import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon, Trash2Icon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Img } from "@/shared/ui/image";
import { Switch } from "@/shared/ui/switch";

interface ModuleCardHorizontalProps {
  mod: Module;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onUninstall?: () => void;
  uninstallPending?: boolean;
  enabledDisabled?: boolean;
  className?: string;
  children?: ReactNode;
}

export function ModuleCardHorizontal({
  mod,
  enabled,
  onEnabledChange,
  onUninstall,
  uninstallPending,
  enabledDisabled,
  className,
  children,
}: ModuleCardHorizontalProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <Button variant="ghost" size="sm" icon={ArrowLeftIcon} asChild>
        <Link to="/settings/modules">
          <Trans>Back</Trans>
        </Link>
      </Button>

      <Card className="overflow-hidden border bg-card/60 py-0">
        <div className="flex flex-col sm:flex-row gap-4 p-4 md:p-5">
          <Img
            src={mod.logo ?? "/modules/stremio.svg"}
            alt={mod.label}
            className="size-20 md:size-24 rounded-xl object-cover shrink-0 border border-border/40 bg-muted"
          />

          <div className="flex-1 min-w-0 space-y-2">
            <div className="space-y-1.5">
              <h1 className="text-xl md:text-2xl font-semibold truncate">{mod.label}</h1>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="glass" className="capitalize text-[10px]">
                  {mod.category}
                </Badge>
                {(mod.tags ?? []).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3">{mod.description}</p>
            {children}
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0">
            {!mod.locked && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  <Trans>Enabled</Trans>
                </span>
                <Switch checked={enabled} disabled={enabledDisabled} onCheckedChange={onEnabledChange} />
              </div>
            )}
            {onUninstall && !mod.locked && (
              <Button
                variant="destructive"
                size="sm"
                icon={Trash2Icon}
                onClick={onUninstall}
                disabled={uninstallPending}
              >
                <Trans>Uninstall</Trans>
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
