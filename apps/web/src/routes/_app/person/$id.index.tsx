import { createFileRoute } from "@tanstack/react-router";

import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";

import { PersonView } from "@/features/person/components/person-view";
import { personQueries } from "@/features/person/hooks/person.queries";

export const Route = createFileRoute("/_app/person/$id/")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(personQueries.details(params.id, countryToTmdbLocale(context.language))),
  component: PersonRoute,
});

function PersonRoute() {
  const { id } = Route.useParams();
  return <PersonView personId={id} />;
}
