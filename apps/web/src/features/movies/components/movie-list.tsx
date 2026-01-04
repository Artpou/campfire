import { useState } from "react";

import { Link } from "@tanstack/react-router";
import { Clapperboard } from "lucide-react";
import type { MultiSearchResult } from "tmdb-ts";

import { CircularProgress } from "@/shared/components/circular-progress";
import { Badge } from "@/shared/ui/badge";
import { ScrollArea } from "@/shared/ui/scroll-area";

import { getPosterUrl } from "@/features/media/helpers/media.helper";

interface MovieListProps {
  movies: Extract<MultiSearchResult, { media_type: "movie" }>[];
  onItemClick?: () => void;
}

function MoviePoster({ posterPath, title }: { posterPath?: string | null; title: string }) {
  const [hasError, setHasError] = useState(false);

  const imageUrl = getPosterUrl(posterPath, "w92");

  if (!imageUrl || hasError) {
    return (
      <div className="w-15 h-[90px] rounded-md shrink-0 bg-card border border-border shadow-md flex items-center justify-center">
        <Clapperboard className="size-7 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <div className="w-15 h-[90px] rounded-md overflow-hidden shrink-0 border border-white/5 shadow-md">
      <img
        src={imageUrl}
        alt={title}
        className="size-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export function MovieList({ movies, onItemClick }: MovieListProps) {
  if (movies.length === 0) {
    return <div className="p-4 text-center text-sm text-muted-foreground">No results found</div>;
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="flex flex-col p-1 mr-2">
        {movies.map((movie) => (
          <Link
            key={movie.id}
            to="/movies/$movieId"
            params={{
              movieId: movie.id.toString(),
            }}
            onClick={onItemClick}
            className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent transition-all group"
          >
            <MoviePoster posterPath={movie.poster_path} title={movie.title} />
            <div className="flex-1 min-w-0 py-1">
              <h4 className="text-lg font-bold truncate group-hover:text-primary transition-colors tracking-tight">
                {movie.title}
              </h4>
              <div className="flex items-center gap-3 mt-1.5">
                <Badge
                  variant="secondary"
                  className="text-[10px] font-black h-5 px-1.5 leading-none uppercase bg-neutral-800 text-white border-none"
                >
                  {movie.media_type}
                </Badge>
                <span className="text-sm font-medium text-muted-foreground">
                  {movie.release_date ? new Date(movie.release_date).getFullYear() : ""}
                </span>
              </div>
            </div>
            {movie.vote_average !== null && (
              <CircularProgress
                value={movie.vote_average * 10}
                size={42}
                strokeWidth={4}
                className="shrink-0 ml-auto"
              />
            )}
          </Link>
        ))}
      </div>
    </ScrollArea>
  );
}
