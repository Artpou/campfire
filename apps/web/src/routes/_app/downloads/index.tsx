import { useMemo, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { formatBytes } from "@seedarr/shared";
import { useQuery, useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ArrowDownIcon, ArrowUpIcon, InfoIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Container } from "@/shared/ui/container";
import { Input } from "@/shared/ui/input";

import { hasMinRole } from "@/features/auth/helpers/role.helper";
import { DownloadsStatsPanel } from "@/features/downloads/components/downloads-stats-panel";
import { downloadStatsQueries } from "@/features/downloads/hooks/download-stats.queries";
import { MediaCard } from "@/features/media/components/media-card";
import { MediaTypeTabs } from "@/features/media/components/media-type-tabs";
import { mediaQueries, refetchMediaInterval } from "@/features/media/hooks/media.queries";
import { useRemoteSync } from "@/features/settings/hooks/remote-sync.queries";
import { settingsQueries } from "@/features/settings/hooks/settings.queries";
import { storageConfigQueries } from "@/features/settings/hooks/storage-config.queries";
import { validateDownloadsSearch } from "@/routes/helpers/downloads-route.helper";

export const Route = createFileRoute("/_app/downloads/")({
  component: DownloadsPage,
  beforeLoad: ({ context }) => {
    if (!hasMinRole(context.user?.role, "member")) {
      throw redirect({ to: "/movies" });
    }
  },
  validateSearch: validateDownloadsSearch,
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
        <div className="flex flex-col gap-4">
          <Input
            type="text"
            h="lg"
            search
            className="w-full"
            placeholder={t`Search in your library...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex items-center justify-between gap-4">
            <MediaTypeTabs value={type} />
            <SyncButton />
          </div>
        </div>

        {stats && (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-6 flex-wrap flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  <Trans>Media</Trans>
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
              <Trans>More info</Trans>
            </Button>
          </div>
        )}

        {filteredResults.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6 gap-4">
            {filteredResults.map((media) => {
              if (!media.download) return null;
              return <MediaCard key={media.download.id} media={media} linkTo="download" />;
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

function SyncButton() {
  const { t } = useLingui();
  const { data: storageEnabled } = useQuery(storageConfigQueries.enabled());
  const { data: tmdbKeyStatus } = useQuery(settingsQueries.tmdbKeyStatus());
  const syncMutation = useRemoteSync();

  if (!storageEnabled?.enabled) return null;

  const handleSync = () => {
    if (!tmdbKeyStatus?.configured) {
      toast.error(t`TMDB API key is required for synchronization. Configure it in Settings > General.`);
      return;
    }
    syncMutation.mutate();
  };

  return (
    <Button variant="outline" size="lg" onClick={handleSync} disabled={syncMutation.isPending}>
      {syncMutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
      <Trans>Synchronize</Trans>
    </Button>
  );
}
