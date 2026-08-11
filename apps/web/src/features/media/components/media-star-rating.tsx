import { useState } from "react";

import { t } from "@lingui/core/macro";
import { StarHalfIcon, StarIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface MediaStarRatingProps {
  /** Score on 0–10 scale (Letterboxd ×2). */
  value: number | null;
  onChange?: (score: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  readOnly?: boolean;
}

const SIZE_CLASS = {
  sm: "size-4",
  md: "size-5",
  lg: "size-7",
} as const;

function starsFromPointer(starIndex: number, clientX: number, target: HTMLElement): number {
  const rect = target.getBoundingClientRect();
  const isLeftHalf = clientX - rect.left < rect.width / 2;
  return isLeftHalf ? starIndex - 0.5 : starIndex;
}

/** Interactive Letterboxd-style 5-star rating with half-star precision. */
export function MediaStarRating({ value, onChange, size = "md", className, readOnly }: MediaStarRatingProps) {
  const [hoverStars, setHoverStars] = useState<number | null>(null);
  const selectedStars = value != null && value > 0 ? value / 2 : 0;
  const displayStars = hoverStars ?? selectedStars;
  const interactive = !readOnly && !!onChange;

  return (
    <fieldset
      className={cn("inline-flex items-center gap-0.5 border-0 p-0 m-0", className)}
      onMouseLeave={() => setHoverStars(null)}
    >
      <legend className="sr-only">{t`Rating`}</legend>
      {Array.from({ length: 5 }, (_, i) => {
        const starIndex = i + 1;
        const full = displayStars >= starIndex;
        const half = !full && displayStars >= starIndex - 0.5;

        return (
          <button
            key={starIndex}
            type="button"
            disabled={!interactive}
            className={cn("relative p-0.5 transition-colors", interactive ? "cursor-pointer" : "cursor-default")}
            onMouseMove={(e) => {
              if (!interactive) return;
              setHoverStars(starsFromPointer(starIndex, e.clientX, e.currentTarget));
            }}
            onClick={(e) => {
              if (!interactive) return;
              const stars = starsFromPointer(starIndex, e.clientX, e.currentTarget);
              onChange?.(stars * 2);
            }}
            aria-label={t`${starIndex} stars`}
          >
            {half ? (
              <StarHalfIcon className={cn(SIZE_CLASS[size], "fill-primary text-primary transition-colors")} />
            ) : (
              <StarIcon
                className={cn(
                  SIZE_CLASS[size],
                  "transition-colors",
                  full ? "fill-primary text-primary" : "fill-transparent text-muted-foreground/60",
                )}
              />
            )}
          </button>
        );
      })}
    </fieldset>
  );
}
