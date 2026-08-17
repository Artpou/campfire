import { useMemo, useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Movie, TV } from "@seedarr/sdk";
import { InfoIcon } from "lucide-react";

import { Flag } from "@/shared/components/flag";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/ui/sheet";

import { MediaBadgeDate } from "@/features/media/components/badge/media-badge-date";
import { MediaBadgeGenre } from "@/features/media/components/badge/media-badge-genre";
import { MediaBadgeLabel } from "@/features/media/components/badge/media-badge-label";
import { MediaBadgeRuntime } from "@/features/media/components/badge/media-badge-runtime";
import { MediaDetails } from "@/features/media/components/media-details";
import { MediaProviders } from "@/features/media/components/media-providers";
import { MediaRatingImdb, MediaRatingTmdb, MediaRatingUser } from "@/features/media/components/rating/media-rating";

interface MediaInfoProps {
  data: Movie | TV;
}

function isMovie(data: Movie | TV): data is Movie {
  return "movie" in data;
}

export function MediaInfo({ data }: MediaInfoProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const media = data.media;
  const movie = isMovie(data) ? data.movie : null;
  const tv = !isMovie(data) ? data.tv : null;

  const title = movie?.title || movie?.original_title || tv?.name || tv?.original_name || "";
  const originalTitle = movie?.original_title || tv?.original_name || "";
  const originalLanguage = movie?.original_language || tv?.original_language || "";
  const overview = movie?.overview || tv?.overview;
  const tagline = movie?.tagline || tv?.tagline;
  const genres = movie?.genres || tv?.genres || [];
  const imdbId = media?.imdbId || movie?.external_ids?.imdb_id || tv?.external_ids?.imdb_id;
  const tmdbScore = media?.vote_average ?? movie?.vote_average ?? tv?.vote_average;
  const tmdbId = movie?.id ?? tv?.id ?? 0;
  const type = movie ? "movie" : "tv";
  const watchProviders = movie?.["watch/providers"] || tv?.["watch/providers"];
  const releaseDate = movie?.release_date || tv?.first_air_date;
  const runtime = movie?.runtime ?? tv?.episode_run_time?.[0];

  const episodeBadge = useMemo(() => {
    if (!tv || !(tv.number_of_seasons ?? 0)) return null;
    return (
      <Trans>
        {tv.number_of_seasons} seasons · {tv.number_of_episodes} episodes
      </Trans>
    );
  }, [tv]);

  const nextEpisode = tv?.next_episode_to_air;
  const lastEpisode = tv?.last_episode_to_air;

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-2">
        <div className="flex gap-2">
          <h1>{title}</h1>
          <Button
            type="button"
            variant="ghost"
            icon={InfoIcon}
            onClick={() => setSheetOpen(true)}
            className="px-0 xl:hidden self-center"
          ></Button>
        </div>
        <div className="flex items-center gap-2">
          <Flag lang={originalLanguage} />
          <p className="text-sm font-semibold text-muted-foreground">{originalTitle}</p>
        </div>
        <div className="flex items-center gap-2.5 text-sm font-medium flex-wrap">
          <MediaBadgeDate date={releaseDate} size="lg" />
          <MediaBadgeRuntime minutes={runtime} size="lg" />
          <MediaBadgeLabel show={!!episodeBadge} size="lg">
            {episodeBadge}
          </MediaBadgeLabel>
          <MediaBadgeLabel show={!!nextEpisode?.air_date} variant="secondary" size="lg">
            {nextEpisode?.air_date ? (
              <Trans>
                Next episode: S{nextEpisode.season_number}E{nextEpisode.episode_number} -{" "}
                {new Date(nextEpisode.air_date).toLocaleDateString()}
              </Trans>
            ) : null}
          </MediaBadgeLabel>
          <MediaBadgeLabel show={!nextEpisode && !!lastEpisode?.air_date} variant="secondary" size="lg">
            {lastEpisode?.air_date ? (
              <Trans>
                Last episode: S{lastEpisode.season_number}E{lastEpisode.episode_number} -{" "}
                {new Date(lastEpisode.air_date).toLocaleDateString(undefined, {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </Trans>
            ) : null}
          </MediaBadgeLabel>
          {genres.slice(0, 4).map((genre) => (
            <MediaBadgeGenre key={typeof genre === "string" ? genre : genre.id} genre={genre} size="lg" />
          ))}
        </div>
      </div>

      {(tagline || overview) && (
        <div className="space-y-1">
          {tagline && (
            <Label variant="secondary" size="lg">
              {tagline}
            </Label>
          )}
          {overview && <p>{overview}</p>}
        </div>
      )}

      <div className="flex flex-col gap-5 pt-1">
        <div className="flex items-end gap-6 flex-wrap">
          <MediaRatingImdb rating={data.imdbRating} imdbId={imdbId} />
          <MediaRatingTmdb score={tmdbScore} tmdbId={tmdbId} type={type} />
          {media && <MediaRatingUser media={media} />}
        </div>
        <MediaProviders watchProviders={watchProviders} mediaName={title} />
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[350px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <div className="mx-4">
            <MediaDetails data={data} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
