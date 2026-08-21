import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** Dashed empty state used by tables / lists (torrent-table style). */
export function EmptyState({ title, subtitle, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn("p-10 border border-dashed rounded-sm bg-muted border-border inline-block space-y-3", className)}
    >
      <p className="font-bold uppercase text-popover-foreground">{title}</p>
      {subtitle ? <p className="text-sm text-muted-foreground max-w-md">{subtitle}</p> : null}
      {action}
    </div>
  );
}
