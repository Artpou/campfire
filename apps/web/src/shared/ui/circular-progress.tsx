import * as React from "react";

import { cn } from "@/lib/utils";

interface CircularProgressProps extends React.ComponentPropsWithoutRef<"div"> {
  value: number;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
}

const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  ({ value, size = 40, strokeWidth = 4, showValue = true, className, ...props }, ref) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    // Determine color based on value
    const getColor = (val: number) => {
      if (val >= 90) return "text-emerald-600"; // Excellent (90-100)
      if (val >= 75) return "text-emerald-500"; // Very Good (75-89)
      if (val >= 60) return "text-lime-500"; // Good (60-74)
      if (val >= 50) return "text-yellow-500"; // Average (50-59)
      if (val >= 40) return "text-orange-500"; // Below Average (40-49)
      if (val >= 25) return "text-orange-600"; // Poor (25-39)
      return "text-red-500"; // Very Poor (0-24)
    };

    return (
      <div
        ref={ref}
        className={cn("dark relative flex items-center justify-center", className)}
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
            className={`${getColor(value)} shadow-inner opacity-20`}
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
            className={cn("transition-all duration-500 ease-in-out", getColor(value))}
          />
        </svg>
        {showValue && (
          <div className="absolute text-white inset-0 flex items-center justify-center">
            <span
              className="font-bold tracking-tighter flex items-center"
              style={{ fontSize: size * 0.38 }}
            >
              {Math.round(value)}
              <span className="ml-0.5 opacity-90" style={{ fontSize: size * 0.26 }}>
                %
              </span>
            </span>
          </div>
        )}
      </div>
    );
  },
);

CircularProgress.displayName = "CircularProgress";

export { CircularProgress };
