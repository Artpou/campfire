import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { PlayCircleIcon } from "lucide-react";

import { useAuth } from "@/features/auth/auth-store";
import { MediaCarouselHorizontal } from "@/features/media/components/carousel/media-carousel-horizontal";
import { mediaQueries, refetchLibraryInterval } from "@/features/media/hooks/media.queries";

interface MediaCarouselWatchingProps {
  type: Media["type"];
}

export function MediaCarouselWatching({ type }: MediaCarouselWatchingProps) {
  const authUser = useAuth((s) => s.user);

  const { data } = useQuery({
    ...mediaQueries.inProgress(type),
    refetchInterval: refetchLibraryInterval,
  });

  const items = data ?? [];
  if (items.length === 0 || !authUser) return null;

  return (
    <MediaCarouselHorizontal
      medias={items}
      seeMoreTo="/downloads"
      title={
        <span className="flex items-center gap-2 flex-wrap">
          <PlayCircleIcon className="size-5 shrink-0" />
          <span className="flex items-center gap-1.5 flex-wrap">
            <Trans>Resume watching</Trans>
          </span>
        </span>
      }
    />
  );
}
