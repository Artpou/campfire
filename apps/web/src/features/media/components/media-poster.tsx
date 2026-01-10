import { useMemo } from "react";

import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { MagnetIcon, Play } from "lucide-react";
import { AppendToResponse, MovieDetails } from "tmdb-ts";

import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/shared/ui/dialog";

import { useRole } from "@/features/auth/hooks/use-role";
import { getPosterUrl } from "@/features/media/helpers/media.helper";

interface MediaPosterProps {
  media: AppendToResponse<MovieDetails, "videos"[], "movie">;
  id?: number;
}

export function MediaPoster({ media, id }: MediaPosterProps) {
  const { role } = useRole();
  const youtubeTrailer = useMemo(() => {
    if (!media?.videos?.results) return null;
    const trailer = media.videos.results.find(
      (video) => video.site === "YouTube" && video.type === "Trailer",
    );
    return trailer || media.videos.results.find((video) => video.site === "YouTube");
  }, [media?.videos]);

  return (
    <div className="flex flex-col shrink-0 space-y-2 items-center max-w-[230px]">
      <img
        src={getPosterUrl(media.poster_path, "w500")}
        alt={media.title}
        className="w-[200px] sm:w-full aspect-2/3 rounded-md object-cover border border-secondary shadow-2xl"
      />

      {youtubeTrailer && (
        <Dialog>
          <DialogTrigger className="cursor-pointer" asChild>
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

      {media && role !== "viewer" && id && (
        <Button className="w-full" asChild>
          <Link to="/movies/$id/torrents" params={{ id: id.toString() }}>
            <MagnetIcon className="size-3 mr-2" />
            <Trans>Torrents</Trans>
          </Link>
        </Button>
      )}
    </div>
  );
}
