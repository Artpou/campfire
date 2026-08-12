import { describe, expect, it } from "vitest";

import { getFirstWatchProviders, getUniqueWatchProviders } from "./watch-providers.helper";

describe("watch-providers.helper", () => {
  it("dedupes providers for a locale country", () => {
    const providers = getUniqueWatchProviders(
      {
        results: {
          US: {
            flatrate: [
              { provider_id: 1, provider_name: "Netflix" },
              { provider_id: 1, provider_name: "Netflix" },
            ],
            buy: [{ provider_id: 2, provider_name: "iTunes" }],
            rent: [{ provider_id: 2, provider_name: "iTunes" }],
          },
        },
      } as never,
      "en-US",
    );

    expect(providers.flatrate).toHaveLength(1);
    expect(providers.buyRent).toHaveLength(1);
  });

  it("returns empty when country missing", () => {
    expect(getUniqueWatchProviders(undefined, "fr-FR")).toEqual({ flatrate: [], buyRent: [] });
  });

  it("prefers flatrate then buy/rent", () => {
    expect(
      getFirstWatchProviders({
        flatrate: [{ provider_id: 1, provider_name: "A" } as never],
        buyRent: [{ provider_id: 2, provider_name: "B" } as never],
      }),
    ).toHaveLength(1);
    expect(
      getFirstWatchProviders({
        flatrate: [],
        buyRent: [{ provider_id: 2, provider_name: "B" } as never, { provider_id: 3, provider_name: "C" } as never],
      }),
    ).toHaveLength(2);
    expect(getFirstWatchProviders({ flatrate: [], buyRent: [] })).toEqual([]);
  });
});
