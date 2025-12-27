import { Film } from "lucide-react";
import { forwardRef, ImgHTMLAttributes, useState } from "react";
import { cn } from "@/lib/utils";

export interface MovieImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallbackClassName?: string;
  iconSize?: number;
}

const MovieImage = forwardRef<HTMLImageElement, MovieImageProps>(
  ({ className, fallbackClassName, iconSize = 64, src, alt, onError, ...props }, ref) => {
    const [imageError, setImageError] = useState(false);
    const hasValidSrc = src && !imageError;

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
        src={src}
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
