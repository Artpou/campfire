/**
 * Formats runtime in minutes to a human-readable string
 * @param minutes - Runtime in minutes
 * @returns Formatted string like "2h 30m", "45m", or "2h", or "N/A" if invalid
 */
export function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) {
    return "N/A";
  }

  const hours = Math.floor(minutes / 60);
  const mins = (minutes % 60).toString().padStart(2, "0");

  return `${hours}h ${mins}min`;
}
