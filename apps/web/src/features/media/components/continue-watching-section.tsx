import type { ContinueWatchingItem, Media } from "@basement/api/types";
import { Trans } from "@lingui/react/macro";

import { CarouselItem } from "@/shared/ui/carousel";
import { CarouselWrapper } from "@/shared/ui/carousel-wrapper";
import { Skeleton } from "@/shared/ui/skeleton";

import { MediaCard } from "@/features/media/components/media-card";
import { useContinueWatching } from "@/features/media/hooks/use-media";

interface ContinueWatchingSectionProps {
  type: Media["type"];
}

export function ContinueWatchingSection({ type }: ContinueWatchingSectionProps) {
  const { data, isLoading } = useContinueWatching(type);

  if (isLoading) {
    return (
      <div className="container mx-auto px-3 sm:px-6 py-4">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="flex gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton
              key={`cw-skeleton-${i.toString()}`}
              className="aspect-2/3 w-[160px] rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.length) return null;

  return (
    <CarouselWrapper title={<Trans>Continue Watching</Trans>}>
      {data.map((item: ContinueWatchingItem) => (
        <CarouselItem key={`cw-${item.type}-${item.id}`}>
          <MediaCard
            media={{
              ...item,
              downloadId: item.downloadId ?? undefined,
              download: !!item.downloadId,
              like: undefined,
              watchList: undefined,
            }}
            progressPercent={item.progressPercent}
            resumeMode
          />
        </CarouselItem>
      ))}
    </CarouselWrapper>
  );
}
