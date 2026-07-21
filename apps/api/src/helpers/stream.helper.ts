import type { StreamingApi } from "hono/utils/stream";

import { PassThrough, Readable } from "node:stream";

const STREAM_HIGH_WATER_MARK = 64 * 1024;

export function ensureNodeReadable(stream: NodeJS.ReadableStream): Readable {
  if (stream instanceof Readable && stream.readableHighWaterMark > 0) {
    return stream;
  }

  const passthrough = new PassThrough({ highWaterMark: STREAM_HIGH_WATER_MARK });
  stream.pipe(passthrough);
  stream.on("error", (error) => passthrough.destroy(error));
  return passthrough;
}

export async function pipeNodeStream(honoStream: StreamingApi, nodeStream: NodeJS.ReadableStream): Promise<void> {
  await honoStream.pipe(toWebStream(nodeStream));
}

function toWebStream(nodeStream: NodeJS.ReadableStream): ReadableStream {
  return Readable.toWeb(ensureNodeReadable(nodeStream));
}
