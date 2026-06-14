import { useMemo, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { ListMediaQuery, Media } from "@seedarr/sdk";
import { useQuery, useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownIcon, ArrowUpIcon, InfoIcon, SearchIcon } from "lucide-react";

import { formatBytes } from "@/shared/helpers/format.helper";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Container } from "@/shared/ui/container";
import { Input } from "@/shared/ui/input";

import { DownloadsStatsPanel } from "@/features/downloads/components/downloads-stats-panel";
import { downloadStatsQueries } from "@/features/downloads/hooks/download-stats.queries";
import { MediaCard } from "@/features/media/components/media-card";
import { MediaTypeTabs } from "@/features/media/components/media-type-tabs";
import { getMediaType } from "@/features/media/helpers/media.helper";
import { mediaQueries, refetchMediaInterval } from "@/features/media/hooks/media.queries";

export const Route = createFileRoute("/_app/downloads/")({
  component: DownloadsPage,
  validateSearch: (search): Partial<ListMediaQuery> => ({ type: getMediaType(search.type) }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureInfiniteQueryData(mediaQueries.list({ filter: "downloaded", type: deps.type })),
    ]),
});

function DownloadsPage() {
  const { type } = Route.useSearch();
  const { t } = useLingui();
  const [search, setSearch] = useState("");
  const [statsOpen, setStatsOpen] = useState(false);

  const { data } = useSuspenseInfiniteQuery({
    ...mediaQueries.list({ filter: "downloaded", type }),
    refetchInterval: refetchMediaInterval,
  });
  const results = data?.pages.flatMap((page) => page.results) ?? [];

  const { data: stats } = useQuery({ ...downloadStatsQueries.get(), refetchInterval: 2000 });

  const filteredResults = useMemo(() => {
    const sorted = [...results].sort((a, b) => {
      const dateA = a.download?.createdAt ? new Date(a.download.createdAt).getTime() : 0;
      const dateB = b.download?.createdAt ? new Date(b.download.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    if (!search.trim()) return sorted;

    const q = search.toLowerCase();
    return sorted.filter(
      (media: Media) => media.title?.toLowerCase().includes(q) || media.original_title?.toLowerCase().includes(q),
    );
  }, [results, search]);

  return (
    <Container>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <MediaTypeTabs value={type} />
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              className="pl-9 py-5"
              placeholder={t`Search in your library...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {stats && (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-6 flex-wrap flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  <Trans>Medias</Trans>
                </span>
                <span className="text-lg font-bold">{stats.count}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  <Trans>Total Size</Trans>
                </span>
                <span className="text-lg font-bold">{formatBytes(stats.totalSize)}</span>
              </div>

              <div className="flex items-center gap-2">
                <ArrowDownIcon className="size-4 text-primary" />
                <span className="text-lg font-bold text-primary">{formatBytes(stats.downloadSpeed)}/s</span>
              </div>

              <div className="flex items-center gap-2">
                <ArrowUpIcon className="size-4 text-blue" />
                <span className="text-lg font-bold text-blue">{formatBytes(stats.uploadSpeed)}/s</span>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={() => setStatsOpen(true)}>
              <InfoIcon className="size-4" />
              <Trans>More infos</Trans>
            </Button>
          </div>
        )}

        {filteredResults.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6 gap-4">
            {filteredResults.map((media) => {
              if (!media.download) return null;
              return <MediaCard key={media.download.id} media={media} />;
            })}
          </div>
        ) : (
          <Card>
            <div className="py-10 text-center">
              <p className="text-muted-foreground">
                {search.trim() ? <Trans>No results found for "{search}"</Trans> : <Trans>No downloads yet</Trans>}
              </p>
            </div>
          </Card>
        )}
      </div>

      <DownloadsStatsPanel open={statsOpen} onOpenChange={setStatsOpen} />
    </Container>
  );
}
