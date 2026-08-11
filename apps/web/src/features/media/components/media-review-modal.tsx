import { useEffect, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { Trash2Icon } from "lucide-react";

import { DialogDelete } from "@/shared/components/dialog/dialog-delete";
import { Button } from "@/shared/ui/button";
import { DatePicker } from "@/shared/ui/date-picker";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

import { MediaStarRating } from "@/features/media/components/media-star-rating";
import { useDeleteReview, useUpsertReview } from "@/features/media/hooks/media.queries";

interface MediaReviewModalProps {
  media: Media;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toIsoDate(value: string | Date | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return undefined;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function MediaReviewModal({ media, open, onOpenChange }: MediaReviewModalProps) {
  const { t } = useLingui();
  const upsertReview = useUpsertReview();
  const deleteReview = useDeleteReview();
  const [score, setScore] = useState<number | null>(media.userScore ?? null);
  const [comment, setComment] = useState(media.userComment ?? "");
  const [watchedAt, setWatchedAt] = useState<string | undefined>(toIsoDate(media.userReviewAt));
  const [deleteOpen, setDeleteOpen] = useState(false);

  const hasExistingReview = media.userScore != null || !!media.userComment;

  useEffect(() => {
    if (open) {
      setScore(media.userScore ?? null);
      setComment(media.userComment ?? "");
      setWatchedAt(toIsoDate(media.userReviewAt) ?? toIsoDate(new Date()));
      setDeleteOpen(false);
    }
  }, [open, media.userScore, media.userComment, media.userReviewAt]);

  const handleSave = () => {
    if (score == null || score <= 0) return;
    upsertReview.mutate(
      { media, score, comment: comment.trim() || null, watchedAt },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const handleDelete = () => {
    deleteReview.mutate(media, {
      onSuccess: () => {
        setDeleteOpen(false);
        onOpenChange(false);
      },
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              <Trans>Review</Trans>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                <Trans>Your rating</Trans>
              </Label>
              <MediaStarRating value={score} onChange={setScore} size="lg" />
            </div>
            <DatePicker
              id="review-watched-at"
              label={<Trans>Watched on</Trans>}
              value={watchedAt}
              onChange={setWatchedAt}
            />
            <div className="space-y-2">
              <Label htmlFor="review-comment">
                <Trans>Comment</Trans>
              </Label>
              <Textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t`Write a short review…`}
                rows={4}
                maxLength={4000}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
            {hasExistingReview ? (
              <Button
                type="button"
                variant="destructive"
                icon={Trash2Icon}
                onClick={() => setDeleteOpen(true)}
                disabled={deleteReview.isPending}
              >
                <Trans>Delete</Trans>
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                <Trans>Cancel</Trans>
              </Button>
              <Button
                type="button"
                loading={upsertReview.isPending}
                disabled={score == null || score <= 0}
                onClick={handleSave}
              >
                <Trans>Save</Trans>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DialogDelete
        open={deleteOpen}
        setOpen={setDeleteOpen}
        validate={handleDelete}
        disabled={deleteReview.isPending}
        title={<Trans>Delete review?</Trans>}
        description={<Trans>Are you sure you want to delete this review? This action cannot be undone.</Trans>}
      />
    </>
  );
}
