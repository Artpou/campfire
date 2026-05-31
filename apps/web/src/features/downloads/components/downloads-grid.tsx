import { Skeleton } from "@/shared/ui/skeleton";

import type { DownloadGroupItem } from "@/features/downloads/helpers/download-grouping";
import { DownloadCard } from "./download-card";
import { DownloadsSeriesGroupCard } from "./downloads-series-group-card";

interface DownloadsGridProps {
  items: DownloadGroupItem[];
  isLoading?: boolean;
  withLoading?: boolean;
}

export function DownloadsGrid({
  items,
  isLoading = false,
  withLoading = true,
}: DownloadsGridProps) {
  if (!isLoading && (!items || !items.length)) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6 gap-4">
      {items.map((item) => {
        if (item.kind === "tv-group") {
          return (
            <div
              key={`group-${item.mediaId}`}
              className="hover:border-primary/50 border-2 border-transparent rounded-xl"
            >
              <DownloadsSeriesGroupCard mediaId={item.mediaId} downloads={item.downloads} inGrid />
            </div>
          );
        }
        return (
          <div
            key={item.download.id}
            className="hover:border-primary/50 border-2 border-transparent rounded-xl"
          >
            <DownloadCard torrent={item.download} inGrid />
          </div>
        );
      })}
      {withLoading &&
        isLoading &&
        Array.from({ length: 20 }, (_, i) => (
          <Skeleton key={`skeleton-${i.toString()}`} className="aspect-2/3 w-full rounded-md" />
        ))}
    </div>
  );
}
