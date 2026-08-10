import type { Media } from "@seedarr/sdk";
import { FilmIcon, TvIcon } from "lucide-react";

import { Img, type ImgProps } from "@/shared/ui/image";

import {
  type BackdropFormat,
  getBackdropUrl,
  getPosterUrl,
  type PosterFormat,
} from "@/features/media/helpers/media.helper";

interface MediaImgBaseProps extends Omit<ImgProps, "fallback" | "src"> {
  media: Media;
}

interface MediaImgPosterProps extends MediaImgBaseProps {
  type?: "poster";
  w?: PosterFormat;
}

interface MediaImgBackdropProps extends MediaImgBaseProps {
  type: "backdrop";
  w?: BackdropFormat;
}

type MediaImgProps = MediaImgBackdropProps | MediaImgPosterProps;

export function MediaImg({ media, type, w, ...props }: MediaImgProps) {
  const src = type === "backdrop" ? getBackdropUrl(media.backdrop_path, w) : getPosterUrl(media.poster_path, w);

  return (
    <Img
      src={src}
      fallback={
        <div className="flex flex-col gap-3 items-center justify-center">
          <span className="text-sm font-medium">{media.title}</span>
          {media.type === "movie" ? <FilmIcon className="size-10" /> : <TvIcon className="size-10" />}
        </div>
      }
      {...props}
    />
  );
}
