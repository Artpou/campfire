import { forwardRef, ImgHTMLAttributes, useState } from "react";

import { Film } from "lucide-react";

import { cn } from "@/lib/utils";

import { getPosterUrl } from "@/features/media/helpers/media.helper";

export interface MovieImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallbackClassName?: string;
  iconSize?: number;
}

const MovieImage = forwardRef<HTMLImageElement, MovieImageProps>(
  ({ className, fallbackClassName, iconSize = 64, src, alt, onError, ...props }, ref) => {
    const [imageError, setImageError] = useState(false);
    const hasValidSrc = src && !imageError;

    const posterUrl = getPosterUrl(src, "w500");

    const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setImageError(true);
      onError?.(e);
    };

    if (!hasValidSrc) {
      return (
        <div
          className={cn(
            "size-full flex flex-col items-center justify-center gap-4 bg-muted p-4",
            fallbackClassName,
          )}
        >
          <Film
            className="text-muted-foreground/40 shrink-0"
            style={{ width: iconSize, height: iconSize }}
          />
          {alt && (
            <p className="text-center text-sm text-muted-foreground line-clamp-3 wrap-break-word">
              {alt}
            </p>
          )}
        </div>
      );
    }

    return (
      <img
        ref={ref}
        src={posterUrl}
        alt={alt}
        className={cn("size-full object-cover", className)}
        onError={handleError}
        {...props}
      />
    );
  },
);

MovieImage.displayName = "MovieImage";

export { MovieImage };
