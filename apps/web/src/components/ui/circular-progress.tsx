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
      if (val >= 70) return "text-emerald-500";
      if (val >= 40) return "text-yellow-500";
      return "text-red-500";
    };

    return (
      <div
        ref={ref}
        className={cn("relative flex items-center justify-center", className)}
        style={{ width: size, height: size }}
        {...props}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <title>Progress</title>
          {/* Background circle fill */}
          <circle cx={size / 2} cy={size / 2} r={size / 2} className="fill-black/40" />
          {/* Background circle track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-white/5 shadow-inner"
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
          <div className="absolute inset-0 flex items-center justify-center">
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
