import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLinkIcon, UserIcon } from "lucide-react";

import { SeedarrLoaderContainer } from "@/shared/components/seedarr-loader-container";
import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Badge } from "@/shared/ui/badge";
import { Container } from "@/shared/ui/container";

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
  const [imgError, setImgError] = useState(false);

  return (
    <div className="pb-20">
      <div className="relative w-full pb-6 pt-6">
        <div className="absolute inset-0 -z-10 bg-linear-to-br from-[oklch(0.22_0.004_240)] via-[oklch(0.18_0.01_250)] to-background">
          <div className="absolute inset-0 bg-linear-to-b from-black/40 via-transparent to-background" />
        </div>

        <Container className="flex flex-col lg:flex-row gap-8 items-center lg:items-start relative">
          <div className="lg:w-1/4 max-w-[250px] w-full">
            <div className="aspect-3/4 overflow-hidden rounded-xl border border-border/60 bg-muted shadow-2xl">
              {!imgError && person.profile_path ? (
                <img
                  src={getPosterUrl(person.profile_path, "w500")}
                  alt={person.name}
                  className="size-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <UserIcon className="size-16 text-muted-foreground" />
                </div>
              )}
            </div>
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
        </Container>
      </div>

      <Container className="flex flex-col gap-8 pt-6">
        <PersonKnownFor knownFor={knownFor} />
        <PersonFilmography filmography={filmography} departments={departments} />
      </Container>
    </div>
  );
}
