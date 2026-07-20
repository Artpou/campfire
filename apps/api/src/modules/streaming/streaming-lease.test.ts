import { describe, expect, it } from "vitest";

import { acquireStreamLease, hasActiveStreams, waitUntilNoStreams } from "./streaming-lease";

describe("streaming-lease", () => {
  it("tracks active streams and resolves waiters when idle", async () => {
    const id = `lease-${crypto.randomUUID()}`;
    expect(hasActiveStreams(id)).toBe(false);

    const release = acquireStreamLease(id);
    expect(hasActiveStreams(id)).toBe(true);

    const waited = waitUntilNoStreams(id, 5_000);
    release();
    await waited;
    expect(hasActiveStreams(id)).toBe(false);
  });
});
