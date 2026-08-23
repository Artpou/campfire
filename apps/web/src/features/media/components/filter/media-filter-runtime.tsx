import type { ReactNode } from "react";

import { ClockIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { LabelWrapper } from "@/shared/ui/label";

import {
  getRuntimePreset,
  type RuntimePreset,
  runtimePresetToFilters,
} from "@/features/media/helpers/filter-options.helper";

const RUNTIME_PRESETS: { id: RuntimePreset; label: string }[] = [
  { id: "short", label: "< 90m" },
  { id: "medium", label: "90m-120m" },
  { id: "long", label: "> 120m" },
];

interface MediaFilterRuntimeProps {
  value: {
    with_runtime_gte?: number;
    with_runtime_lte?: number;
  };
  onChange: (value: { with_runtime_gte?: number; with_runtime_lte?: number }) => void;
  label: ReactNode;
}

export function MediaFilterRuntime({ value, onChange, label }: MediaFilterRuntimeProps) {
  const runtimePreset = getRuntimePreset(value);

  const handleRuntimePreset = (preset: RuntimePreset) => {
    const next = runtimePreset === preset ? undefined : preset;
    onChange(runtimePresetToFilters(next));
  };

  return (
    <LabelWrapper label={label} icon={ClockIcon}>
      <div className="flex w-full gap-2">
        {RUNTIME_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            size="sm"
            className="flex-1"
            variant={runtimePreset === preset.id ? "default" : "input"}
            onClick={() => handleRuntimePreset(preset.id)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </LabelWrapper>
  );
}
