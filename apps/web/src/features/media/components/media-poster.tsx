import { useMemo } from "react";

import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { Play, Search } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/shared/ui/dialog";

import { getPosterUrl } from "@/features/media/helpers/media.helper";

interface MediaPosterProps {
  media: {
    poster_path?: string;
    title?: string;
    original_title?: string;
    release_date?: string;
    videos?: {
      results?: {
        site?: string;
        type?: string;
        key?: string;
      }[];
    };
  };
  movieId?: number;
}

export function MediaPoster({ media, movieId }: MediaPosterProps) {
  const youtubeTrailer = useMemo(() => {
    if (!media?.videos?.results) return null;
    const trailer = media.videos.results.find(
      (video) => video.site === "YouTube" && video.type === "Trailer",
    );
    return trailer || media.videos.results.find((video) => video.site === "YouTube");
  }, [media?.videos]);

  const releaseYear = media?.release_date ? media.release_date.split("-")[0] : undefined;

  const sanitizedMovieTitle = useMemo(() => {
    const clean = (t?: string) => t?.normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";
    const isLatin = (t: string) => !/[^\u0020-\u02AF]/.test(t);
    const original = clean(media?.original_title);
    const title = clean(media?.title);
    return isLatin(original) ? original : isLatin(title) ? title : original || title;
  }, [media]);

  return (
    <div className="flex flex-col shrink-0 space-y-2 items-center">
      <img
        src={getPosterUrl(media.poster_path, "w500")}
        alt={media.title}
        className="w-[200px] sm:w-full aspect-2/3 rounded-md object-cover border border-secondary shadow-2xl"
      />

      {youtubeTrailer && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary" className="w-full">
              <Play className="size-3 fill-current mr-2" />
              <Trans>Watch Trailer</Trans>
            </Button>
          </DialogTrigger>
          <DialogContent
            className="sm:max-w-[90vw] max-w-[95vw] p-0 border-none aspect-video"
            showCloseButton={false}
          >
            <iframe
              src={`https://www.youtube.com/embed/${youtubeTrailer.key}?autoplay=1`}
              title={media.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full rounded-lg"
            />
          </DialogContent>
        </Dialog>
      )}

      {media && (
        <Button className="w-full" asChild>
          <Link
            to="/torrent"
            search={{
              q: sanitizedMovieTitle,
              movie: movieId,
              year: releaseYear,
            }}
          >
            <Search className="size-3 mr-2" />
            <Trans>Search Torrent</Trans>
          </Link>
        </Button>
      )}
    </div>
  );
}
