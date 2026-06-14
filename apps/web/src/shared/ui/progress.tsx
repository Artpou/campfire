import * as React from "react";

import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  variant = "default",
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { variant?: "default" | "paused" | "error" | "white" }) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full shadow-md",
        variant === "default" && "bg-primary/20 shadow-primary/20",
        variant === "paused" && "bg-warning/20 shadow-warning/20",
        variant === "error" && "bg-destructive/20 shadow-destructive/20",
        variant === "white" && "bg-white/20 shadow-white/20",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full flex-1 transition-all",
          variant === "default" && "bg-primary",
          variant === "paused" && "bg-warning",
          variant === "error" && "bg-destructive",
          variant === "white" && "bg-white",
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
