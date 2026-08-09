export const formatBytes = (bytes: number | undefined) => {
  if (!bytes) return "0 B";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const sizeIndex = Math.min(i, sizes.length - 1);

  return `${(bytes / k ** sizeIndex).toFixed(2)} ${sizes[sizeIndex]}`;
};

export const formatTime = (ms: number | undefined) => {
  if (!ms) return "∞";
  if (!Number.isFinite(ms) || ms < 0) return "∞";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

export function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) {
    return "N/A";
  }

  const hours = Math.floor(minutes / 60);
  const mins = (minutes % 60).toString().padStart(2, "0");

  return `${hours}h ${mins}min`;
}

/** Clock time when a runtime (minutes) started now would end. */
export function getEndsAt(minutes: number | null | undefined, locale?: string): string | null {
  if (!minutes || minutes <= 0) return null;
  return new Date(Date.now() + minutes * 60_000).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
