import { useEffect, useLayoutEffect, useState } from "react";

import type { Media } from "@seedarr/sdk";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

import { flattenInfiniteResults, type InfiniteResultsQuery } from "@/shared/hooks/use-infinite-list";
import { Skeleton } from "@/shared/ui/skeleton";

import { MediaCard } from "./card/media-card";

const MEDIA_GRID_MIN_COL = 165;
const MEDIA_GRID_GAP = 16;

interface MediaGridProps {
  items?: Media[];
  query?: InfiniteResultsQuery<Media>;
  showType?: boolean;
  downloadMode?: boolean;
}

function getMediaGridColumns(width: number): number {
  return Math.max(1, Math.floor((width + MEDIA_GRID_GAP) / (MEDIA_GRID_MIN_COL + MEDIA_GRID_GAP)));
}

export function MediaGrid({ items, query, showType, downloadMode }: MediaGridProps) {
  const displayItems = items ?? flattenInfiniteResults(query);
  const isPending = Boolean(query?.isPending) && displayItems.length === 0;

  const [parentEl, setParentEl] = useState<HTMLDivElement | null>(null);
  const [columns, setColumns] = useState(() =>
    typeof window === "undefined" ? 6 : getMediaGridColumns(Math.min(window.innerWidth - 64, 1400)),
  );
  const [gridWidth, setGridWidth] = useState(0);

  useLayoutEffect(() => {
    if (!parentEl) return;

    const measure = () => {
      const width = parentEl.getBoundingClientRect().width;
      setGridWidth(width);
      setColumns(getMediaGridColumns(width));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parentEl);
    return () => observer.disconnect();
  }, [parentEl]);

  const rowCount = Math.ceil(displayItems.length / columns);
  const estimateSize = () => {
    const width = gridWidth || MEDIA_GRID_MIN_COL;
    const colWidth = (width - MEDIA_GRID_GAP * (columns - 1)) / columns;
    return colWidth * 1.5 + MEDIA_GRID_GAP;
  };

  const virtualizer = useWindowVirtualizer({
    count: isPending ? 0 : rowCount,
    estimateSize,
    overscan: 4,
    scrollMargin: parentEl?.offsetTop ?? 0,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const lastRow = virtualRows.at(-1);

  useEffect(() => {
    virtualizer.measure();
  }, [virtualizer]);

  const fetchNextPage = query?.fetchNextPage;
  const hasNextPage = query?.hasNextPage;
  const isFetchingNextPage = query?.isFetchingNextPage;

  useEffect(() => {
    if (lastRow == null || rowCount === 0) return;
    if (lastRow.index >= rowCount - 2 && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage?.();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, lastRow?.index, rowCount, lastRow]);

  if (isPending) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(165px,1fr))] gap-4">
        {Array.from({ length: 20 }, (_, i) => (
          <Skeleton key={`skeleton-${i.toString()}`} className="aspect-2/3 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (displayItems.length === 0) return null;

  return (
    <div ref={setParentEl} className="w-full">
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualRows.map((virtualRow) => {
          const start = virtualRow.index * columns;
          const rowItems = displayItems.slice(start, start + columns);

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                paddingBottom: MEDIA_GRID_GAP,
                transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
              }}
            >
              {rowItems.map((item) => (
                <div key={`${item.type}-${item.id}`} className="relative">
                  <MediaCard
                    media={item}
                    showPreview={!downloadMode}
                    showPlay
                    showSocial={!downloadMode}
                    showType={showType}
                    showQuality={downloadMode}
                    showDownload
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
