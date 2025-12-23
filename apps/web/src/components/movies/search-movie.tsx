import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { Search, X } from "lucide-react";
import ms from "ms";
import { useEffect, useState } from "react";
import type { MultiSearchResult } from "tmdb-ts";
import { MovieList } from "@/components/movies/movie-list";
import { MovieListSkeleton } from "@/components/movies/movie-list-skeletons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { useTmdb } from "@/hooks/use-tmdb";
import { parseJustWatchResponse } from "@/lib/movie.parser";

const UNLOGGED_URL = "https://imdb.iamidiotareyoutoo.com";

export function SearchMovie() {
  const { apiKey, tmdb } = useTmdb();
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["movies", debouncedSearch, apiKey],
    queryFn: async () => {
      if (!apiKey) {
        return await fetch(`${UNLOGGED_URL}/justwatch?q=${debouncedSearch}&L=fr_FR`)
          .then((res) => res.json())
          .then((data) => parseJustWatchResponse(data));
      }

      if (!tmdb) return { page: 1, results: [], total_pages: 0, total_results: 0 };
      return await tmdb.search.multi({ query: debouncedSearch });
    },
    enabled: debouncedSearch.length > 0,
    staleTime: ms("5 minutes"),
  });

  const movies =
    searchResults?.results.filter(
      (item): item is Extract<MultiSearchResult, { media_type: "movie" }> =>
        item.media_type === "movie",
    ) || [];

  return (
    <>
      <Button
        variant="outline"
        className="w-full max-w-sm justify-start text-sm text-muted-foreground font-normal relative h-9 px-3"
        onClick={() => setIsOpen(true)}
      >
        <Search className="mr-2 size-4 shrink-0" />
        <span>Search movies...</span>
        <Kbd className="absolute right-1.5 top-1.5">
          <span className="text-xs">⌘</span>K
        </Kbd>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="p-0 max-w-2xl!" showCloseButton={false}>
          <DialogHeader className="sr-only">
            <DialogTitle>Search Movies</DialogTitle>
          </DialogHeader>
          <div className="flex items-center border-b px-4 mx-1 sticky top-0 bg-background">
            <Search className="mr-3 size-5 opacity-40" />
            <Input
              className="h-14 border-0 text-lg focus-visible:ring-0 bg-transparent!"
              placeholder="Type to search movies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-full"
                onClick={() => setSearch("")}
              >
                <X className="size-5" />
              </Button>
            )}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {search.length === 0 ? (
              <div className="p-12 text-center">
                <Search className="mx-auto size-12 text-muted-foreground/20" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Search for movies to see results here
                </p>
              </div>
            ) : isLoading ? (
              <MovieListSkeleton />
            ) : movies.length > 0 ? (
              <MovieList
                movies={movies}
                onItemClick={() => {
                  setIsOpen(false);
                  setSearch("");
                }}
              />
            ) : (
              <div className="p-12 text-center text-sm text-muted-foreground">
                No results found for "{search}"
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
