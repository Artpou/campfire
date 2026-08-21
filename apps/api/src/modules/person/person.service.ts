import { BadRequestError } from "@/shared/errors/error";
import { AuthenticatedService } from "@/shared/services/authenticated.service";

import { mergeMediaEnrichment } from "@/modules/media/media.helper";
import type { MediaEnriched } from "@/modules/media/media.types";
import { listEnrichedMedia } from "@/modules/media/media-list.repository";
import { tmdbMovieToMedia, tmdbTVToMedia } from "@/modules/tmdb/tmdb.helper";
import { tmdbRequest } from "@/modules/tmdb/tmdb.service";
import type {
  TMDBItem,
  TMDBPersonCreditCast,
  TMDBPersonCreditCrew,
  TMDBPersonDetails,
} from "@/modules/tmdb/tmdb.types";
import type { User } from "@/modules/user/user.schema";
import type { Person, PersonFilmographyCrew } from "./person.types";

const KNOWN_FOR_LIMIT = 8;

function creditToMedia(credit: TMDBPersonCreditCast | TMDBPersonCreditCrew): MediaEnriched {
  const item: TMDBItem = {
    id: credit.id,
    title: credit.title,
    name: credit.name,
    original_title: credit.original_title,
    original_name: credit.original_name,
    overview: credit.overview,
    poster_path: credit.poster_path,
    backdrop_path: credit.backdrop_path,
    vote_average: credit.vote_average,
    release_date: credit.release_date,
    first_air_date: credit.first_air_date,
    genre_ids: credit.genre_ids,
    media_type: credit.media_type,
  };

  return credit.media_type === "tv" ? tmdbTVToMedia(item) : tmdbMovieToMedia(item);
}

function creditScore(credit: Pick<TMDBPersonCreditCast, "vote_count" | "popularity">): number {
  return (credit.vote_count ?? 0) * (credit.popularity ?? 0);
}

function releaseKey(media: MediaEnriched): string {
  return media.release_date ?? "";
}

export class PersonService extends AuthenticatedService {
  private readonly locale: string;

  constructor(user: User, locale: string) {
    super(user);
    this.locale = locale;
  }

  async get(id: string): Promise<Person> {
    if (!id) throw new BadRequestError("Person id is required");

    const personData = await tmdbRequest<TMDBPersonDetails>(`/person/${id}`, this.locale, {
      appendToResponse: "combined_credits,external_ids",
    });

    const castCredits = personData.combined_credits?.cast ?? [];
    const crewCredits = personData.combined_credits?.crew ?? [];

    const knownForSource: Array<TMDBPersonCreditCast | TMDBPersonCreditCrew> =
      personData.known_for_department && personData.known_for_department !== "Acting"
        ? crewCredits.filter((c) => c.department === personData.known_for_department)
        : castCredits;

    const knownForCredits = [...knownForSource]
      .filter((c) => c.poster_path)
      .sort((a, b) => creditScore(b) - creditScore(a))
      .filter(
        (credit, index, list) =>
          list.findIndex((c) => c.id === credit.id && c.media_type === credit.media_type) === index,
      )
      .slice(0, KNOWN_FOR_LIMIT);

    const castMedia = castCredits
      .filter(
        (credit, index, list) =>
          list.findIndex((c) => c.id === credit.id && c.media_type === credit.media_type) === index,
      )
      .map(creditToMedia)
      .sort((a, b) => releaseKey(b).localeCompare(releaseKey(a)));

    const crewMedia: PersonFilmographyCrew[] = crewCredits
      .filter(
        (credit, index, list) =>
          list.findIndex(
            (c) =>
              c.id === credit.id &&
              c.media_type === credit.media_type &&
              c.department === credit.department &&
              c.job === credit.job,
          ) === index,
      )
      .map((credit) => ({
        ...creditToMedia(credit),
        department: credit.department,
        job: credit.job,
      }))
      .sort((a, b) => releaseKey(b).localeCompare(releaseKey(a)));

    const allMedia = [...knownForCredits.map(creditToMedia), ...castMedia, ...crewMedia];
    const uniqueIds = [...new Set(allMedia.map((m) => m.id.toString()))];
    const mediaMap = await listEnrichedMedia(this.user.id, { ids: uniqueIds });

    const departments = [...new Set(crewMedia.map((c) => c.department).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    );

    return {
      id,
      person: personData,
      knownFor: mergeMediaEnrichment(knownForCredits.map(creditToMedia), mediaMap, { preserveType: true }),
      filmography: {
        cast: mergeMediaEnrichment(castMedia, mediaMap, { preserveType: true }),
        crew: mergeMediaEnrichment(crewMedia, mediaMap, { preserveType: true }),
      },
      departments,
    };
  }
}
