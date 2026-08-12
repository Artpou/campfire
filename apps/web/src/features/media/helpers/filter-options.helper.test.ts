import { describe, expect, it } from "vitest";

import {
  getRuntimePreset,
  joinFilterIds,
  optionsFromIds,
  parseLabeledOptions,
  runtimePresetToFilters,
  serializeLabeledOptions,
  splitFilterIds,
} from "./filter-options.helper";

describe("filter-options.helper", () => {
  it("splits and joins filter ids", () => {
    expect(splitFilterIds()).toEqual([]);
    expect(splitFilterIds("1| 2 |")).toEqual(["1", "2"]);
    expect(joinFilterIds([])).toBeUndefined();
    expect(joinFilterIds(["1", "2"])).toBe("1|2");
  });

  it("serializes labeled options", () => {
    expect(parseLabeledOptions("1|2", "Action|Drama")).toEqual([
      { id: "1", name: "Action" },
      { id: "2", name: "Drama" },
    ]);
    expect(serializeLabeledOptions([])).toEqual({});
    expect(serializeLabeledOptions([{ id: "1", name: "Action" }])).toEqual({
      ids: "1",
      labels: "Action",
    });
  });

  it("maps ids through a catalog", () => {
    const catalog = [
      { id: "1", name: "Action" },
      { id: "2", name: "Drama" },
    ];
    expect(optionsFromIds(undefined, catalog)).toEqual([]);
    expect(optionsFromIds(["2", "9"], catalog)).toEqual([{ id: "2", name: "Drama" }]);
  });

  it("maps runtime presets", () => {
    expect(getRuntimePreset({ with_runtime_lte: 90 })).toBe("short");
    expect(getRuntimePreset({ with_runtime_gte: 90, with_runtime_lte: 120 })).toBe("medium");
    expect(getRuntimePreset({ with_runtime_gte: 120 })).toBe("long");
    expect(getRuntimePreset({})).toBeUndefined();
    expect(runtimePresetToFilters("short")).toEqual({ with_runtime_gte: undefined, with_runtime_lte: 90 });
    expect(runtimePresetToFilters("medium")).toEqual({ with_runtime_gte: 90, with_runtime_lte: 120 });
    expect(runtimePresetToFilters("long")).toEqual({ with_runtime_gte: 120, with_runtime_lte: undefined });
    expect(runtimePresetToFilters(undefined)).toEqual({ with_runtime_gte: undefined, with_runtime_lte: undefined });
  });
});
