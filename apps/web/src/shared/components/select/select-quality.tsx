import { Trans } from "@lingui/react/macro";
import type { Resolution } from "@seedarr/contracts";

import { Select } from "@/shared/components/select/select";

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
      options={QUALITY_LEVELS.map((level) => ({
        value: level ?? "all",
        label: !level ? <Trans>All qualities</Trans> : level,
      }))}
      triggerClassName={triggerClassName}
    />
  );
}
