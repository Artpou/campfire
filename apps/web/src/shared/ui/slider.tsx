import * as React from "react";

import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";

interface SliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  withTooltip?: boolean;
  step?: number;
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  step,
  withTooltip = false,
  ...props
}: SliderProps) {
  const _values = React.useMemo(
    () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]),
    [value, defaultValue, min, max],
  );

  const [isDragging, setIsDragging] = React.useState(false);
  const [tooltipOpen, setTooltipOpen] = React.useState<boolean[]>(
    Array(_values.length).fill(false),
  );

  const formatValue = React.useCallback(
    (val: number) => {
      if (step !== undefined) {
        const decimals = step.toString().split(".")[1]?.length ?? 0;
        return val.toFixed(decimals);
      }
      return val.toString();
    },
    [step],
  );

  return (
    <TooltipProvider>
      <SliderPrimitive.Root
        data-slot="slider"
        defaultValue={defaultValue}
        value={value}
        min={min}
        max={max}
        step={step}
        className={cn(
          "relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
          className,
        )}
        {...props}
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className={cn(
            "bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
          )}
        >
          <SliderPrimitive.Range
            data-slot="slider-range"
            className={cn(
              "bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
            )}
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => {
          const thumbValue = _values[index] ?? min;
          const shouldShowTooltip = withTooltip && (tooltipOpen[index] || isDragging);

          if (withTooltip) {
            return (
              <Tooltip key={String(index)} open={shouldShowTooltip}>
                <TooltipTrigger asChild>
                  <SliderPrimitive.Thumb
                    data-slot="slider-thumb"
                    className="border-primary ring-ring/50 block size-4 shrink-0 rounded-full border bg-white shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
                    onPointerDown={() => {
                      if (withTooltip) {
                        setIsDragging(true);
                        setTooltipOpen(Array(_values.length).fill(true));
                      }
                    }}
                    onPointerUp={() => {
                      if (withTooltip) {
                        setIsDragging(false);
                        setTooltipOpen(Array(_values.length).fill(false));
                      }
                    }}
                    onPointerEnter={() => {
                      if (withTooltip && !isDragging) {
                        setTooltipOpen((prev) => {
                          const next = [...prev];
                          next[index] = true;
                          return next;
                        });
                      }
                    }}
                    onPointerLeave={() => {
                      if (withTooltip && !isDragging) {
                        setTooltipOpen((prev) => {
                          const next = [...prev];
                          next[index] = false;
                          return next;
                        });
                      }
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{formatValue(thumbValue)}</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <SliderPrimitive.Thumb
              key={String(index)}
              data-slot="slider-thumb"
              className="border-primary ring-ring/50 block size-4 shrink-0 rounded-full border bg-white shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
            />
          );
        })}
      </SliderPrimitive.Root>
    </TooltipProvider>
  );
}

export { Slider };
