import { Trans } from "@lingui/react/macro";
import type { Resolution } from "@seedarr/sdk";

import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

export const QUALITY_LEVELS = [null, "480P", "720P", "1080P", "2160P", "4K"] as (Resolution | null)[];

interface SelectQualityProps {
  value: Resolution | null;
  onValueChange: (quality: Resolution | null) => void;
  triggerClassName?: string;
}

export function SelectQuality({ value, onValueChange, triggerClassName }: SelectQualityProps) {
  return (
    <Select
      value={value ?? "all"}
      onValueChange={(next) => onValueChange(next === "all" ? null : (next as Resolution))}
    >
      <SelectTrigger className={cn(triggerClassName)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {QUALITY_LEVELS.map((level) => (
          <SelectItem key={level ?? "all"} value={level ?? "all"}>
            {!level ? <Trans>All qualities</Trans> : level}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
