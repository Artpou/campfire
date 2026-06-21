const tabValues = ["watch-list", "like"] as const;

export type ListsTab = (typeof tabValues)[number];

export const listsTabValues = tabValues;

function parseListsTab(value: unknown): ListsTab {
  if (typeof value === "string" && tabValues.includes(value as ListsTab)) {
    return value as ListsTab;
  }

  return "watch-list";
}

export function validateListsSearch(search: Record<string, unknown>): { tab: ListsTab } {
  return { tab: parseListsTab(search.tab) };
}
