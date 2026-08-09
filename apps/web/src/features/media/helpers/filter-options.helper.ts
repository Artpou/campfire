export type FilterOption = {
  id: string;
  name: string;
  image?: string;
};

export type RuntimePreset = "short" | "medium" | "long";

export function splitFilterIds(value?: string): string[] {
  if (!value) return [];
  return value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function joinFilterIds(ids: string[]): string | undefined {
  return ids.length > 0 ? ids.join("|") : undefined;
}

export function toggleFilterId(value: string | undefined, id: string): string | undefined {
  const ids = splitFilterIds(value);
  const next = ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
  return joinFilterIds(next);
}

export function parseLabeledOptions(ids?: string, labels?: string): FilterOption[] {
  const idList = splitFilterIds(ids);
  const labelList = splitFilterIds(labels);
  return idList.map((id, index) => ({
    id,
    name: labelList[index] ?? id,
  }));
}

export function serializeLabeledOptions(options: FilterOption[]): {
  ids?: string;
  labels?: string;
} {
  if (options.length === 0) return {};
  return {
    ids: joinFilterIds(options.map((option) => option.id)),
    labels: joinFilterIds(options.map((option) => option.name)),
  };
}

export function optionsFromIds(ids: string[] | undefined, catalog: FilterOption[]): FilterOption[] {
  if (!ids?.length) return [];
  const byId = new Map(catalog.map((option) => [option.id, option]));
  return ids.flatMap((id) => {
    const option = byId.get(id);
    return option ? [option] : [];
  });
}

export function getRuntimePreset(value: {
  with_runtime_gte?: number;
  with_runtime_lte?: number;
}): RuntimePreset | undefined {
  const { with_runtime_gte: gte, with_runtime_lte: lte } = value;
  if (gte === undefined && lte === 90) return "short";
  if (gte === 90 && lte === 120) return "medium";
  if (gte === 120 && lte === undefined) return "long";
  return undefined;
}

export function runtimePresetToFilters(preset: RuntimePreset | undefined): {
  with_runtime_gte?: number;
  with_runtime_lte?: number;
} {
  if (preset === "short") return { with_runtime_gte: undefined, with_runtime_lte: 90 };
  if (preset === "medium") return { with_runtime_gte: 90, with_runtime_lte: 120 };
  if (preset === "long") return { with_runtime_gte: 120, with_runtime_lte: undefined };
  return { with_runtime_gte: undefined, with_runtime_lte: undefined };
}
