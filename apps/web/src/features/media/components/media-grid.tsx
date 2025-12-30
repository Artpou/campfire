import { Skeleton } from "@/shared/ui/skeleton";

import { Media } from "@/features/media/media";
import { MediaCard } from "./media-card";

interface MediaGridProps {
  items: Media[];
  isLoading?: boolean;
}

export function MediaGrid({ items, isLoading = false }: MediaGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
        {Array.from({ length: 20 }, (_, i) => (
          <Skeleton key={`skeleton-${i.toString()}`} className="aspect-2/3 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
      {items.map((item) => (
        <div
          key={`${item.type}-${item.id}`}
          className="hover:border-primary border-2 border-transparent rounded-xl"
        >
          <MediaCard media={item} />
        </div>
      ))}
    </div>
  );
}
