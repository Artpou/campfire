import { ProgressCircular } from "@/shared/ui/progress-circular";

interface MediaRatingProps {
  media: { vote_average?: number | null | undefined };
  size?: number;
  strokeWidth?: number;
}

export function MediaRating({ media, size = 40, strokeWidth = 4 }: MediaRatingProps) {
  const getColor = (val: number) => {
    if (val >= 90) return "text-emerald-600"; // Excellent (90-100)
    if (val >= 75) return "text-emerald-500"; // Very Good (75-89)
    if (val >= 60) return "text-lime-500"; // Good (60-74)
    if (val >= 50) return "text-yellow-500"; // Average (50-59)
    if (val >= 40) return "text-orange-500"; // Below Average (40-49)
    if (val >= 25) return "text-orange-600"; // Poor (25-39)
    return "text-red-500"; // Very Poor (0-24)
  };

  const value = media.vote_average ? media.vote_average * 10 : 0;

  return (
    <ProgressCircular value={value} size={size} strokeWidth={strokeWidth} color={getColor(value)}>
      <span className="font-bold tracking-tighter flex items-center" style={{ fontSize: size * 0.38 }}>
        {Math.round(value)}
        <span className="ml-0.5 opacity-90" style={{ fontSize: size * 0.26 }}>
          %
        </span>
      </span>
    </ProgressCircular>
  );
}
