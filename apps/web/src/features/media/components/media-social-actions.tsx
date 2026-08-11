import { useState } from "react";

import { t } from "@lingui/core/macro";
import type { Media } from "@seedarr/sdk";
import { ClockPlusIcon, HeartIcon, MessageSquareIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";

import { MediaReviewModal } from "@/features/media/components/media-review-modal";
import { MediaStarRating } from "@/features/media/components/media-star-rating";
import {
  useDeleteReview,
  useToggleLike,
  useToggleWatchList,
  useUpsertReview,
} from "@/features/media/hooks/media.queries";

interface MediaSocialActionsProps {
  media: Media;
  className?: string;
  size?: "lg" | "xl";
}

export function MediaSocialActions({ media, className, size = "xl" }: MediaSocialActionsProps) {
  const toggleLike = useToggleLike();
  const toggleWatchList = useToggleWatchList();
  const upsertReview = useUpsertReview();
  const deleteReview = useDeleteReview();
  const [commentOpen, setCommentOpen] = useState(false);

  const hasScore = media.userScore != null && media.userScore > 0;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex gap-3">
        <Button
          size={size === "lg" ? "icon-lg" : "icon-xl"}
          variant={media.liked ? "default" : "outline"}
          rounded
          onClick={() => toggleLike.mutate(media)}
          aria-label={t`Like`}
        >
          <HeartIcon className={cn(media.liked && "fill-white")} />
        </Button>
        <Button
          size={size === "lg" ? "icon-lg" : "icon-xl"}
          variant={media.inWatchList ? "default" : "outline"}
          rounded
          onClick={() => toggleWatchList.mutate(media)}
          aria-label={t`Watchlist`}
        >
          <ClockPlusIcon className={cn(media.inWatchList && "text-white")} />
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {hasScore && (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => deleteReview.mutate(media)}
            loading={deleteReview.isPending}
            aria-label={t`Remove rating`}
            icon={XIcon}
          />
        )}
        <MediaStarRating
          value={media.userScore}
          onChange={(score) => upsertReview.mutate({ media, score, comment: media.userComment })}
          size="md"
        />
        <Button
          size="icon-sm"
          variant={media.userComment ? "default" : "outline"}
          rounded
          onClick={() => setCommentOpen(true)}
          aria-label={t`Comment`}
          icon={MessageSquareIcon}
        />
      </div>

      <MediaReviewModal media={media} open={commentOpen} onOpenChange={setCommentOpen} />
    </div>
  );
}
