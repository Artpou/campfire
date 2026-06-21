export function todayIsoDate(): string {
  return new Date().toISOString().split("T")[0];
}
