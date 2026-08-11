import { Trans } from "@lingui/react/macro";
import type { Media, User } from "@seedarr/sdk";
import { PencilIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";

import { UserAvatar } from "@/features/user/components/user-avatar";

interface MediaUserReviewProps {
  media: Media;
  user: Pick<User, "id" | "avatarPath" | "username" | "pseudo">;
  onEdit: () => void;
}

export function MediaUserReview({ media, user, onEdit }: MediaUserReviewProps) {
  if (!media.userComment) return null;

  const displayName = user.pseudo || user.username;

  return (
    <div className="space-y-2 max-w-2xl">
      <div className="flex items-center gap-2">
        <UserAvatar user={user} size="xs" />
        <span className="text-sm font-medium">{displayName}</span>
      </div>
      <p className="text-sm leading-relaxed italic text-popover-foreground border-l-2 border-primary/40 pl-3">
        {media.userComment}
      </p>
      <Button size="sm" variant="secondary" icon={PencilIcon} onClick={onEdit}>
        <Trans>Edit</Trans>
      </Button>
    </div>
  );
}
