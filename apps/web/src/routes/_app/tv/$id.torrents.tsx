import { createFileRoute } from "@tanstack/react-router";

import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
import { redirectIfNotRole } from "@/shared/helpers/role.helper";

import { MediaTorrentsView } from "@/features/media/components/view/media-torrents-view";
import { moduleQueries } from "@/features/module/hooks/module.queries";
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
  component: TvTorrentsRoute,
  beforeLoad: ({ context, params }) => {
    redirectIfNotRole(context, "member", { to: "/tv/$id", params: { id: params.id } });
  },
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(tvQueries.details(params.id, countryToTmdbLocale(context.language))),
      context.queryClient.ensureQueryData(moduleQueries.list()),
    ]),
  validateSearch: (search: Record<string, unknown>): TvTorrentsSearch => {
    return {
      season: optionalPositiveInt(search.season),
      episode: optionalPositiveInt(search.episode),
    };
  },
});

function TvTorrentsRoute() {
  const { id } = Route.useParams();
  const { season, episode } = Route.useSearch();
  return <MediaTorrentsView mediaId={id} mediaType="tv" season={season} episode={episode} />;
}
