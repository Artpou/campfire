import { logger } from "@/shared/helpers/logger.helper";

const leaseCounts = new Map<string, number>();
const idleWaiters = new Map<string, Array<() => void>>();

export function acquireStreamLease(downloadId: string): () => void {
  leaseCounts.set(downloadId, (leaseCounts.get(downloadId) ?? 0) + 1);

  let released = false;
  return (): void => {
    if (released) return;
    released = true;

    const next = (leaseCounts.get(downloadId) ?? 1) - 1;
    if (next > 0) {
      leaseCounts.set(downloadId, next);
      return;
    }

    leaseCounts.delete(downloadId);
    const waiters = idleWaiters.get(downloadId);
    idleWaiters.delete(downloadId);
    for (const wake of waiters ?? []) wake();
  };
}

export function hasActiveStreams(downloadId: string): boolean {
  return (leaseCounts.get(downloadId) ?? 0) > 0;
}

export async function waitUntilNoStreams(downloadId: string, timeoutMs = 2 * 60 * 60 * 1000): Promise<void> {
  if (!hasActiveStreams(downloadId)) return;

  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      logger.warn("STREAM_LEASE", `Timed out waiting for streams on ${downloadId}; proceeding`);
      resolve();
    }, timeoutMs);

    const wake = (): void => {
      clearTimeout(timer);
      resolve();
    };

    const list = idleWaiters.get(downloadId) ?? [];
    list.push(wake);
    idleWaiters.set(downloadId, list);
  });
}
