import * as React from "react";

import { cn } from "@/lib/utils";

interface CircularProgressProps extends React.ComponentPropsWithoutRef<"div"> {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

const ProgressCircular = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  ({ value, size = 40, strokeWidth = 4, color, children, className, ...props }, ref) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    return (
      <div
        ref={ref}
        className={cn("transition-all duration-200 dark relative flex items-center justify-center", className)}
        style={{ width: size, height: size }}
        {...props}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <title>Progress</title>
          {/* Background circle fill */}
          <circle cx={size / 2} cy={size / 2} r={size / 2} className="fill-background/60" />
          {/* Background circle track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className={`${color} shadow-inner opacity-20`}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn("transition-all duration-500 ease-in-out", color)}
          />
        </svg>
        <div className="absolute">{children}</div>
      </div>
    );
  },
);

ProgressCircular.displayName = "CircularProgress";

export { ProgressCircular };
