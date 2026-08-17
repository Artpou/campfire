import { useState } from "react";

import { t } from "@lingui/core/macro";
import type { Media } from "@seedarr/sdk";
import { ClockPlusIcon, HeartIcon, StarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";

import { MediaReviewModal } from "@/features/media/components/modal/media-review-modal";
import { useToggleLike, useToggleWatchList } from "@/features/media/hooks/media.queries";

interface MediaSocialActionsProps {
  media: Media;
  className?: string;
  size?: "lg" | "xl";
}

/** Like + watchlist only. User rating lives in MediaRatingUser on detail pages. */
export function MediaSocialActions({ media, className, size = "xl" }: MediaSocialActionsProps) {
  const toggleLike = useToggleLike();
  const toggleWatchList = useToggleWatchList();
  const iconSize = size === "lg" ? "icon-lg" : "icon-xl";

  const [open, setOpen] = useState(false);

  return (
    <div className={cn("flex flex-row gap-3", className)}>
      <Button
        size={iconSize}
        variant={media.userScore != null ? "default" : "outline"}
        rounded
        onClick={() => setOpen(true)}
        aria-label={t`Review`}
      >
        <StarIcon className={cn(media.userScore != null && "fill-white")} />
      </Button>
      <Button
        size={iconSize}
        variant={media.liked ? "default" : "outline"}
        rounded
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleLike.mutate(media);
        }}
        aria-label={t`Like`}
      >
        <HeartIcon className={cn(media.liked && "fill-white")} />
      </Button>
      <Button
        size={iconSize}
        variant={media.inWatchList ? "default" : "outline"}
        rounded
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleWatchList.mutate(media);
        }}
        aria-label={t`Watchlist`}
      >
        <ClockPlusIcon className={cn(media.inWatchList && "text-white")} />
      </Button>
      <MediaReviewModal media={media} open={open} onOpenChange={setOpen} />
    </div>
  );
}
