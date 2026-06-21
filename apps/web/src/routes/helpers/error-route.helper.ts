export function validateErrorSearch(search: Record<string, unknown>): { message?: string } {
  return {
    message: typeof search.message === "string" ? search.message : undefined,
  };
}
