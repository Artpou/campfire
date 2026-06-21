import { describe, expect, it, vi } from "vitest";

import { buildTvDiscoverOptions, validateTvDiscoverSearch } from "@/features/media/helpers/discover-search.helper";

describe("/tv validateSearch", () => {
  it("parses TV-specific date filters", () => {
    expect(
      validateTvDiscoverSearch({
        selected: "upcoming",
        first_air_date_gte: "2024-06-01",
        first_air_date_lte: "2024-12-31",
      }),
    ).toMatchObject({
      selected: "upcoming",
      first_air_date_gte: "2024-06-01",
      first_air_date_lte: "2024-12-31",
    });
  });

  it("maps upcoming tab to first air date filter", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T12:00:00Z"));

    expect(buildTvDiscoverOptions({ selected: "upcoming" })).toMatchObject({
      "first_air_date.gte": "2024-03-15",
    });

    vi.useRealTimers();
  });
});
