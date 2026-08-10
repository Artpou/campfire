import { Trans } from "@lingui/react/macro";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLinkIcon, UserIcon } from "lucide-react";

import { SeedarrLoaderContainer } from "@/shared/components/seedarr-loader-container";
import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Badge } from "@/shared/ui/badge";
import { Container } from "@/shared/ui/container";
import { Img } from "@/shared/ui/image";

import { getPosterUrl } from "@/features/media/helpers/media.helper";
import { PersonFilmography } from "@/features/person/components/person-filmography";
import { PersonInfo } from "@/features/person/components/person-info";
import { PersonKnownFor } from "@/features/person/components/person-known-for";
import { personQueries } from "@/features/person/hooks/person.queries";

export const Route = createFileRoute("/_app/person/$id/")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(personQueries.details(params.id, countryToTmdbLocale(context.language))),
  component: PersonPage,
  pendingComponent: () => <SeedarrLoaderContainer />,
});

function PersonPage() {
  const params = Route.useParams();
  const locale = useTmdbLocale();
  const { data } = useSuspenseQuery(personQueries.details(params.id, locale));
  const { person, knownFor, filmography, departments } = data;

  return (
    <Container>
      <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-start relative">
        <div className="lg:w-1/4 max-w-[250px] w-full">
          <Img
            src={getPosterUrl(person.profile_path, "w500")}
            alt={person.name}
            className="size-full object-cover rounded-xl border border-border/60 bg-muted shadow-2xl"
            fallback={<UserIcon className="size-16 text-muted-foreground" />}
          />
        </div>
        <div className="lg:w-3/4 flex flex-col gap-6">
          <PersonInfo person={person} />
          <div className="flex flex-wrap gap-2">
            {person.imdb_id && (
              <Badge variant="secondary" className="text-md px-2 py-1">
                <a
                  href={`https://www.imdb.com/name/${person.imdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Trans>IMDb</Trans>
                  <ExternalLinkIcon className="size-4" />
                </a>
              </Badge>
            )}
            <Badge variant="secondary" className="text-md px-2 py-1">
              <a
                href={`https://www.themoviedb.org/person/${person.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Trans>TMDB</Trans>
                <ExternalLinkIcon className="size-4" />
              </a>
            </Badge>
          </div>
        </div>
      </div>
      <PersonKnownFor knownFor={knownFor} />
      <PersonFilmography filmography={filmography} departments={departments} />
    </Container>
  );
}
