import { useMemo } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { Movie, TV } from "@seedarr/sdk";
import { FilmIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/shared/ui/dialog";

interface MediaButtonTrailerProps {
  title: string;
  data: Movie | TV;
}

export function MediaButtonTrailer({ title, data }: MediaButtonTrailerProps) {
  const item = "movie" in data ? data.movie : data.tv;
  const { i18n } = useLingui();

  const youtubeTrailer = useMemo(() => {
    const videos = item?.videos?.results;
    if (!videos) return null;

    return (
      videos.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.iso_3166_1 === i18n.locale) ??
      videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
      videos.find((v) => v.site === "YouTube")
    );
  }, [item?.videos, i18n.locale]);

  if (!youtubeTrailer) return null;

  return (
    <Dialog>
      <DialogTrigger className="cursor-pointer" asChild>
        <Button variant="secondary" className="w-full">
          <FilmIcon className="size-3" />
          <Trans>Watch Trailer</Trans>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[90vw] max-w-[95vw] p-0 border-none aspect-video" showCloseButton={false}>
        <iframe
          src={`https://www.youtube.com/embed/${youtubeTrailer.key}?autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full rounded-lg"
        />
      </DialogContent>
    </Dialog>
  );
}
