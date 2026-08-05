import type { MediaEnriched } from "@/modules/media/media.types";
import type { TMDBPersonDetails } from "@/modules/tmdb/tmdb.types";

export type PersonFilmographyCrew = MediaEnriched & { department: string; job: string };

export type Person = {
  id: string;
  person: TMDBPersonDetails;
  knownFor: MediaEnriched[];
  filmography: {
    cast: MediaEnriched[];
    crew: PersonFilmographyCrew[];
  };
  departments: string[];
};
