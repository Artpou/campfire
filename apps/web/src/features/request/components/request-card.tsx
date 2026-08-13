import type { Media, MediaRequest } from "@seedarr/sdk";

import { useRole } from "@/features/auth/hooks/use-role";
import { MediaCardHorizontal } from "@/features/media/components/card/media-card-horizontal";
import { RequestActions } from "@/features/request/components/request-actions";
import { RequestStatusBadge } from "@/features/request/components/request-status-badge";
import { UserProfile } from "@/features/user/components/user-profile";

interface RequestCardProps {
  request: MediaRequest;
}

export function RequestCard({ request }: RequestCardProps) {
  const { hasRole } = useRole();

  const canTorrent = hasRole("member");
  const status = request.status ?? "pending";
  const media = request.media as Media;

  return (
    <MediaCardHorizontal
      media={media}
      className="h-full"
      link={
        canTorrent && status === "pending"
          ? {
              to: media.type === "tv" ? "/tv/$id/torrents" : "/movies/$id/torrents",
              params: { id: media.id.toString() },
            }
          : undefined
      }
    >
      <div className="space-y-2">
        <UserProfile className="flex w-fit mb-0" user={{ ...request.user, avatarPath: null }} size="xs" />

        <div className="flex items-end justify-between gap-2">
          <RequestStatusBadge status={status} />

          <RequestActions request={request} />
        </div>
      </div>
    </MediaCardHorizontal>
  );
}
