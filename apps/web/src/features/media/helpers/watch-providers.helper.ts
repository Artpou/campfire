import type { TMDBWatchProvider } from "@seedarr/sdk";

type CountryProviders = {
  flatrate?: TMDBWatchProvider[];
  buy?: TMDBWatchProvider[];
  rent?: TMDBWatchProvider[];
};

export type UniqueWatchProviders = {
  flatrate: TMDBWatchProvider[];
  buyRent: TMDBWatchProvider[];
};

function dedupeProviders(providers: TMDBWatchProvider[]): TMDBWatchProvider[] {
  return providers.filter((v, i, a) => a.findIndex((t) => t.provider_id === v.provider_id) === i);
}

/** Extract unique flatrate / buy+rent providers for a TMDB locale country code. */
export function getUniqueWatchProviders(
  watchProviders: { results?: Record<string, CountryProviders> } | undefined,
  tmdbLocale: string | undefined,
): UniqueWatchProviders {
  const countryCode = tmdbLocale?.split("-")[1] || "US";
  const countryProviders = watchProviders?.results?.[countryCode];
  if (!countryProviders) return { flatrate: [], buyRent: [] };

  const flatrate = "flatrate" in countryProviders ? dedupeProviders(countryProviders.flatrate ?? []) : [];
  const buy = "buy" in countryProviders ? (countryProviders.buy ?? []) : [];
  const rent = "rent" in countryProviders ? (countryProviders.rent ?? []) : [];
  const buyRent = dedupeProviders([...buy, ...rent]);

  return { flatrate, buyRent };
}

export function getFirstWatchProviders(providers: UniqueWatchProviders, limit = 4): TMDBWatchProvider[] {
  if (providers.flatrate.length > 0) return providers.flatrate.slice(0, limit);
  if (providers.buyRent.length > 0) return providers.buyRent.slice(0, limit);
  return [];
}
