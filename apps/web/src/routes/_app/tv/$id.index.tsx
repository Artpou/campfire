import { createFileRoute } from "@tanstack/react-router";

import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";

import type { MediaDetailTab } from "@/features/media/components/view/media-detail-view";
import { TvDetailView } from "@/features/tv/components/tv-detail-view";
import { tvQueries } from "@/features/tv/hooks/tv.queries";

const VALID_TABS: MediaDetailTab[] = ["info", "downloads", "server"];

function validateSearch(search: Record<string, unknown>): { tab?: MediaDetailTab } {
  const tab = search.tab;
  if (typeof tab === "string" && (VALID_TABS as string[]).includes(tab)) return { tab: tab as MediaDetailTab };
  return {};
}

export const Route = createFileRoute("/_app/tv/$id/")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(tvQueries.details(params.id, countryToTmdbLocale(context.language))),
  component: TvRoute,
  validateSearch,
});

function TvRoute() {
  const { id } = Route.useParams();
  const { tab } = Route.useSearch();
  return <TvDetailView tvId={id} urlTab={tab} />;
}
