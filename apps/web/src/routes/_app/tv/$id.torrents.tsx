import { useMemo, useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { AppBreadcrumb } from "@/shared/components/app-breadcrumb";
import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Container } from "@/shared/ui/container";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

import { TorrentIndexersTable } from "@/features/torrent/components/torrent-indexers-table";
import { TorrentTable } from "@/features/torrent/components/torrent-table";
import { indexerQueries } from "@/features/torrent/hooks/indexer.queries";
import { useTorrents } from "@/features/torrent/hooks/torrent.queries";
import { tvQueries } from "@/features/tv/hooks/tv.queries";

export interface TvTorrentsSearch {
  season?: number;
  episode?: number;
}

const optionalPositiveInt = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.floor(v);
  if (typeof v === "string" && v.length > 0) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return undefined;
};

export const Route = createFileRoute("/_app/tv/$id/torrents")({
  component: TVTorrentsPage,
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(tvQueries.details(params.id, countryToTmdbLocale(context.language))),
      context.queryClient.ensureQueryData(indexerQueries.list({ withDisabled: false })),
    ]),
  validateSearch: (search: Record<string, unknown>): TvTorrentsSearch => {
    return {
      season: optionalPositiveInt(search.season),
      episode: optionalPositiveInt(search.episode),
    };
  },
});

const ALL_EPISODES = "all";

function TVTorrentsPage() {
  const params = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useLingui();

  const locale = useTmdbLocale();
  const { data: tvData } = useSuspenseQuery(tvQueries.details(params.id, locale));
  const { data: managers } = useSuspenseQuery(indexerQueries.list({ withDisabled: false }));
  const { torrents, sources, indexerStats, isLoading } = useTorrents(tvData.media, managers, {
    season: search.season,
    episode: search.episode,
  });

  const [visibleSources, setVisibleSources] = useState<Set<string>>(new Set());

  const { tv, media } = tvData;
  const validSeasons = useMemo(() => (tv?.seasons ?? []).filter((s) => s.season_number > 0), [tv]);

  const selectedSeason = search.season ?? validSeasons[0]?.season_number;

  const { data: seasonDetails } = useQuery({
    ...tvQueries.season(Number(params.id), selectedSeason ?? 1, locale),
    enabled: !!selectedSeason,
  });

  const filteredTorrents = useMemo(() => {
    if (visibleSources.size === 0) return torrents;
    return torrents.filter((torrent) => torrent.indexerId && visibleSources.has(torrent.indexerId));
  }, [torrents, visibleSources]);

  const handleSeasonChange = (value: string) => {
    navigate({
      to: "/tv/$id/torrents",
      params,
      search: { season: Number(value), episode: undefined },
      resetScroll: false,
    });
  };

  const handleEpisodeChange = (value: string) => {
    navigate({
      to: "/tv/$id/torrents",
      params,
      search: {
        season: selectedSeason,
        episode: value === ALL_EPISODES ? undefined : Number(value),
      },
      resetScroll: false,
    });
  };

  return (
    <Container>
      <AppBreadcrumb
        items={[
          { name: t(msg`TV Shows`), link: "/tv" },
          { name: media.title, link: `/tv/${params.id}` },
          { name: t(msg`Torrents`) },
        ]}
      />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-end mb-4">
        <div className="flex flex-col gap-2 w-full sm:w-48">
          <Label>
            <Trans>Season</Trans>
          </Label>
          <Select
            value={selectedSeason?.toString() ?? ""}
            onValueChange={handleSeasonChange}
            disabled={validSeasons.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {validSeasons.map((season) => (
                <SelectItem key={season.season_number} value={season.season_number.toString()}>
                  <Trans>Season {season.season_number}</Trans>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2 w-full sm:w-64">
          <Label>
            <Trans>Episode</Trans>
          </Label>
          <Select value={search.episode?.toString() ?? ALL_EPISODES} onValueChange={handleEpisodeChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_EPISODES}>
                <Trans>All episodes (full season)</Trans>
              </SelectItem>
              {(seasonDetails?.episodes ?? [])
                .slice()
                .sort((a, b) => a.episode_number - b.episode_number)
                .map((ep) => (
                  <SelectItem key={ep.id} value={ep.episode_number.toString()}>
                    {`E${ep.episode_number.toString().padStart(2, "0")} - ${ep.name}`}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {sources.length > 1 ? (
        <div className="xl:grid xl:grid-cols-7 xl:gap-6">
          <div className="xl:col-span-5">
            <TorrentTable torrents={filteredTorrents} media={media} isLoading={isLoading} />
          </div>
          <div className="hidden xl:block xl:col-span-2">
            <TorrentIndexersTable
              sources={sources}
              indexerStats={indexerStats}
              onVisibilityChange={setVisibleSources}
            />
          </div>
        </div>
      ) : (
        <TorrentTable torrents={filteredTorrents} media={media} isLoading={isLoading} />
      )}
    </Container>
  );
}
