import { type ReactNode, useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { StarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "@/shared/ui/label";

import { MediaReviewModal } from "@/features/media/components/modal/media-review-modal";

interface MediaRatingProps {
  label: ReactNode;
  /** Display value already on the target scale (e.g. 8.1 for /10, 4.0 for /5). */
  value: number;
  max: number;
  starClassName: string;
  className?: string;
  href?: string | null;
  onClick?: () => void;
  meta?: ReactNode;
}

function RatingBody({
  label,
  value,
  max,
  starClassName,
  meta,
}: Omit<MediaRatingProps, "className" | "href" | "onClick">) {
  return (
    <>
      <Label variant="secondary">{label}</Label>
      <div className="flex items-center gap-2.5">
        <StarIcon className={cn("size-8 shrink-0", starClassName)} />
        <div className="flex flex-col leading-none gap-0.5">
          <div className="flex items-baseline gap-0.5">
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-sm text-muted-foreground">/{max}</span>
          </div>
          {meta ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
        </div>
      </div>
    </>
  );
}

/** Shared labeled score block (label + star + value/max). */
function MediaRating({ label, value, max, starClassName, className, href, onClick, meta }: MediaRatingProps) {
  const body = <RatingBody label={label} value={value} max={max} starClassName={starClassName} meta={meta} />;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn("inline-flex flex-col gap-1.5 text-left", className)}>
        {body}
      </button>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("inline-flex flex-col gap-1.5 group", className)}
      >
        {body}
      </a>
    );
  }

  return <div className={cn("inline-flex flex-col gap-1.5", className)}>{body}</div>;
}

interface MediaRatingTmdbProps {
  score: number | null | undefined;
  tmdbId: number | string;
  type: "movie" | "tv";
  className?: string;
}

export function MediaRatingTmdb({ score, tmdbId, type, className }: MediaRatingTmdbProps) {
  if (score == null || score <= 0) return null;

  return (
    <MediaRating
      label={<Trans>TMDB score</Trans>}
      value={score / 2}
      max={5}
      starClassName="fill-white text-white"
      href={`https://www.themoviedb.org/${type}/${tmdbId}`}
      className={className}
    />
  );
}

interface MediaRatingImdbProps {
  rating: number | null | undefined;
  imdbId?: string | null;
  className?: string;
}

export function MediaRatingImdb({ rating, imdbId, className }: MediaRatingImdbProps) {
  if (rating == null || rating <= 0) return null;

  return (
    <MediaRating
      label={<Trans>IMDb score</Trans>}
      value={rating}
      max={10}
      starClassName="fill-[#f5c518] text-[#f5c518]"
      href={imdbId ? `https://www.imdb.com/title/${imdbId}` : null}
      className={className}
    />
  );
}

interface MediaRatingUserProps {
  media: Media;
  className?: string;
}

/** Dedicated user rating action — always visible on detail pages. */
export function MediaRatingUser({ media, className }: MediaRatingUserProps) {
  const [open, setOpen] = useState(false);
  const score = media.userScore != null && media.userScore > 0 ? media.userScore : null;

  if (score == null || score <= 0) return null;

  return (
    <>
      <MediaRating
        label={<Trans>My score</Trans>}
        value={score / 2}
        max={5}
        starClassName="fill-primary text-primary cursor-pointer"
        onClick={() => setOpen(true)}
        className={className}
      />
      <MediaReviewModal media={media} open={open} onOpenChange={setOpen} />
    </>
  );
}
