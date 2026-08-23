import type { Media } from "@seedarr/sdk";

import { joinFilterIds, splitFilterIds } from "@/features/media/helpers/filter-options.helper";

export type GenreItem = { id: number; name: string };

export type MergedGenre = { id: string; name: string; movieId?: number; tvId?: number };

export function mergeGenresByName(movieGenres: GenreItem[], tvGenres: GenreItem[]): MergedGenre[] {
  const byName = new Map<string, MergedGenre>();

  for (const genre of movieGenres) {
    const key = genre.name.toLowerCase();
    const existing = byName.get(key);
    if (existing) {
      existing.movieId = genre.id;
      existing.id =
        joinFilterIds([existing.movieId?.toString(), existing.tvId?.toString()].filter(Boolean) as string[]) ??
        existing.id;
    } else {
      byName.set(key, { id: genre.id.toString(), name: genre.name, movieId: genre.id });
    }
  }

  for (const genre of tvGenres) {
    const key = genre.name.toLowerCase();
    const existing = byName.get(key);
    if (existing) {
      existing.tvId = genre.id;
      existing.id =
        joinFilterIds([existing.movieId?.toString(), existing.tvId?.toString()].filter(Boolean) as string[]) ??
        existing.id;
    } else {
      byName.set(key, { id: genre.id.toString(), name: genre.name, tvId: genre.id });
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function genresForScope(
  scope: Media["type"] | "both",
  movieGenres: GenreItem[],
  tvGenres: GenreItem[],
): MergedGenre[] {
  if (scope === "movie") {
    return movieGenres.map((genre) => ({ id: genre.id.toString(), name: genre.name, movieId: genre.id }));
  }
  if (scope === "tv") {
    return tvGenres.map((genre) => ({ id: genre.id.toString(), name: genre.name, tvId: genre.id }));
  }
  return mergeGenresByName(movieGenres, tvGenres);
}

export function categoryImagePath(genre: MergedGenre, scope: Media["type"] | "both"): string {
  if (scope === "tv" || (scope === "both" && genre.tvId && !genre.movieId)) {
    return `/tv/category/${genre.tvId ?? genre.id}.jpg`;
  }
  return `/movie/category/${genre.movieId ?? genre.id}.jpg`;
}

export function toggleGenreSelection(
  genre: MergedGenre,
  valueMode: "id" | "name",
  current: string | undefined,
): string | undefined {
  const key = valueMode === "name" ? genre.name : genre.id;
  const selected = splitFilterIds(current);
  if (selected.includes(key)) {
    return joinFilterIds(selected.filter((entry) => entry !== key));
  }
  return joinFilterIds([...selected, key]);
}

export function isGenreInSelection(
  genre: MergedGenre,
  valueMode: "id" | "name",
  withGenres: string | undefined,
): boolean {
  if (!withGenres) return false;
  const selected = splitFilterIds(withGenres);
  if (valueMode === "name") return selected.includes(genre.name);
  const genreIds = splitFilterIds(genre.id);
  return selected.some((id) => genreIds.includes(id));
}
