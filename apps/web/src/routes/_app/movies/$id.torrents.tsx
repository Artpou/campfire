import { createFileRoute } from "@tanstack/react-router";

import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
import { redirectIfNotRole } from "@/shared/helpers/role.helper";

import { MediaTorrentsView } from "@/features/media/components/media-torrents-view";
import { movieQueries } from "@/features/movies/hooks/movie.queries";

export const Route = createFileRoute("/_app/movies/$id/torrents")({
  component: MovieTorrentsRoute,
  beforeLoad: ({ context, params }) => {
    redirectIfNotRole(context, "member", { to: "/movies/$id", params: { id: params.id } });
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(movieQueries.details(params.id, countryToTmdbLocale(context.language))),
});

function MovieTorrentsRoute() {
  const { id } = Route.useParams();
  return <MediaTorrentsView mediaId={id} mediaType="movie" />;
}
