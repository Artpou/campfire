import type { MediaItem } from "@basement/api/types";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { CircularProgress } from "@/components/ui/circular-progress";
import { MovieImage } from "./movie-image";

interface MovieCardProps {
  movie: MediaItem;
  size?: "sm" | "md";
}

export function MovieCard({ movie, size = "md" }: MovieCardProps) {
  const title = "title" in movie ? movie.title : movie.name;
  const releaseDate = "release_date" in movie ? movie.release_date : movie.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : "";

  if (movie.id === 83533) console.log(movie);

  return (
    <Link to="/movies/$movieId" params={{ movieId: movie.id.toString() }} className="group">
      <Card className="overflow-hidden hover:ring-2 hover:ring-primary transition-all aspect-2/3 relative pt-0 pb-0">
        <MovieImage src={movie.poster_path || ""} alt={title} iconSize={size === "sm" ? 48 : 64} />
        <div
          className={`absolute bottom-0 left-0 right-0 bg-linear-to-t from-background via-background/95 to-background/60 transition-all duration-200 translate-y-full group-hover:translate-y-0 ${
            size === "sm" ? "p-2" : "p-3"
          }`}
        >
          <h3 className={`font-semibold ${size === "sm" ? "text-xs" : "text-base"}`}>{title}</h3>
          <p className={`text-muted-foreground ${size === "sm" ? "text-[10px]" : "text-sm"}`}>
            {year}
          </p>
        </div>
        {movie.vote_average != null && movie.vote_average > 0 && (
          <div className={`absolute ${size === "sm" ? "top-1 right-1" : "top-2 right-2"}`}>
            <CircularProgress
              value={(movie.vote_average || 0) * 10}
              size={size === "sm" ? 36 : 52}
              strokeWidth={size === "sm" ? 4 : 5}
            />
          </div>
        )}
      </Card>
    </Link>
  );
}
