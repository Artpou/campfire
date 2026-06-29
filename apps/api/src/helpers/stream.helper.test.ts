import type { StreamingApi } from "hono/utils/stream";
import { describe, expect, it, vi } from "vitest";

import { PassThrough, Readable } from "node:stream";
import { ensureNodeReadable, pipeNodeStream } from "./stream.helper";

describe("ensureNodeReadable", () => {
  it("returns native readables unchanged", () => {
    const readable = Readable.from(Buffer.from("ok"));
    expect(ensureNodeReadable(readable)).toBe(readable);
  });

  it("wraps webtorrent-like streams without highWaterMark", () => {
    const source = new PassThrough();
    const webtorrentLike = {
      pipe: (destination: PassThrough) => source.pipe(destination),
      on: (...args: Parameters<PassThrough["on"]>) => source.on(...args),
    } as unknown as NodeJS.ReadableStream;

    const readable = ensureNodeReadable(webtorrentLike);
    expect(readable.readableHighWaterMark).toBeGreaterThan(0);
    expect(() => Readable.toWeb(readable)).not.toThrow();
  });
});

describe("pipeNodeStream", () => {
  it("pipes data to hono stream", async () => {
    const chunks: Uint8Array[] = [];
    const honoStream = {
      pipe: vi.fn(async (webStream: ReadableStream<Uint8Array>) => {
        const reader = webStream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
      }),
    } as Pick<StreamingApi, "pipe"> as StreamingApi;

    const webtorrentLike = {
      pipe: (destination: PassThrough) => {
        destination.end(Buffer.from("streamed"));
        return destination;
      },
      on: () => webtorrentLike,
    } as unknown as NodeJS.ReadableStream;

    await pipeNodeStream(honoStream, webtorrentLike);
    expect(Buffer.concat(chunks).toString()).toBe("streamed");
  });
});
