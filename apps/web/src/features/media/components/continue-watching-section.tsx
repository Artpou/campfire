import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { LibraryBigIcon } from "lucide-react";

import { CarouselItem } from "@/shared/ui/carousel";
import { CarouselWrapper } from "@/shared/ui/carousel-wrapper";
import { Skeleton } from "@/shared/ui/skeleton";

import { MediaCard } from "@/features/media/components/media-card";
import { useMedias } from "@/features/media/hooks/use-media";

interface MediaLibrarySectionProps {
  type: Media["type"];
}

export function MediaLibrarySection({ type }: MediaLibrarySectionProps) {
  const { results, isLoading } = useMedias({ filter: "downloaded", type });

  if (isLoading) {
    return (
      <div className="container mx-auto px-3 sm:px-6 py-4">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="flex gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={`lib-skeleton-${i.toString()}`} className="aspect-2/3 w-[160px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!results?.length) return null;

  return (
    <CarouselWrapper
      title={
        <span className="flex items-center gap-2">
          <LibraryBigIcon className="size-5" />
          <Trans>My Library</Trans>
        </span>
      }
      seeMoreTo="/downloads"
    >
      {results.map((media) => (
        <CarouselItem key={`lib-${media.type}-${media.id}`}>
          <MediaCard media={media} resumeMode />
        </CarouselItem>
      ))}
    </CarouselWrapper>
  );
}
