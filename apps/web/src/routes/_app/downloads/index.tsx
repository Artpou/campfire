import { useMemo, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { hasMinRole } from "@seedarr/contracts";
import type { Media } from "@seedarr/sdk";
import { formatBytes } from "@seedarr/shared";
import { useQuery, useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ArrowDownIcon, ArrowUpIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Container } from "@/shared/ui/container";
import { Input } from "@/shared/ui/input";

import { ManualSyncWizard } from "@/features/downloads/components/manual-sync-wizard";
import { MediaTable } from "@/features/downloads/components/media-table";
import { downloadQueries } from "@/features/downloads/hooks/download.queries";
import { MediaCard } from "@/features/media/components/card/media-card";
import { MediaTypeTabs } from "@/features/media/components/tabs/media-tabs-type";
import { MediaTabsViewMode } from "@/features/media/components/tabs/media-tabs-view-mode";
import { hasActiveDownload } from "@/features/media/helpers/media.helper";
import { ACTIVE_DOWNLOAD_INTERVAL, mediaQueries, refetchMediaInterval } from "@/features/media/hooks/media.queries";
import { useRemoteSync } from "@/features/settings/hooks/remote-sync.queries";
import { settingsQueries } from "@/features/settings/hooks/settings.queries";
import { storageConfigQueries } from "@/features/settings/hooks/storage-config.queries";
import { useUserPreferences } from "@/features/settings/stores/user-preference-store";
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
  const viewMode = useUserPreferences((s) => s.viewMode);

  const { data } = useSuspenseInfiniteQuery({
    ...mediaQueries.list({ filter: "downloaded", type }),
    refetchInterval: refetchMediaInterval,
  });
  const results = data?.pages.flatMap((page) => page.results) ?? [];

  const { data: stats } = useQuery({
    ...downloadQueries.stats(),
    refetchInterval: hasActiveDownload(data) ? ACTIVE_DOWNLOAD_INTERVAL : false,
  });

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
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MediaTabsViewMode />
            <MediaTypeTabs value={type} />
          </div>
          <SyncButton />
        </div>

        {stats && (
          <div className="flex items-center gap-6 flex-wrap">
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

            {stats.downloadSpeed > 0 && (
              <div className="flex items-center gap-2">
                <ArrowDownIcon className="size-4 text-primary" />
                <span className="text-lg font-bold text-primary">{formatBytes(stats.downloadSpeed)}/s</span>
              </div>
            )}

            {stats.uploadSpeed > 0 && (
              <div className="flex items-center gap-2">
                <ArrowUpIcon className="size-4 text-blue" />
                <span className="text-lg font-bold text-blue">{formatBytes(stats.uploadSpeed)}/s</span>
              </div>
            )}
          </div>
        )}

        <Input
          type="text"
          h="lg"
          search
          className="w-full"
          placeholder={t`Search in your library...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {filteredResults.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6 gap-4">
              {filteredResults.map((media) => {
                if (!media.download) return null;
                return <MediaCard key={media.download.id} media={media} withDownload />;
              })}
            </div>
          ) : (
            <MediaTable media={filteredResults} />
          )
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
    </Container>
  );
}

interface SyncError {
  name: string;
  path: string;
  type: "movie" | "tv";
}

function SyncButton() {
  const { t } = useLingui();
  const [unmatchedFiles, setUnmatchedFiles] = useState<SyncError[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);

  const { data: storageEnabled } = useQuery(storageConfigQueries.enabled());
  const { data: tmdbKeyStatus } = useQuery(settingsQueries.tmdbKeyStatus());
  const syncMutation = useRemoteSync((files) => {
    setUnmatchedFiles(files);
    setWizardOpen(true);
  });

  if (!storageEnabled?.enabled) return null;

  const handleSync = () => {
    if (!tmdbKeyStatus?.configured) {
      toast.error(t`TMDB API key is required for synchronization. Configure it in Settings > General.`);
      return;
    }
    syncMutation.mutate();
  };

  return (
    <>
      <Button variant="secondary" size="lg" onClick={handleSync} loading={syncMutation.isPending} icon={RefreshCwIcon}>
        <Trans>Synchronize</Trans>
      </Button>
      <ManualSyncWizard files={unmatchedFiles} open={wizardOpen} onOpenChange={setWizardOpen} />
    </>
  );
}
