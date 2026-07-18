import ffmpeg from "fluent-ffmpeg";

import { logger } from "@/helpers/logger.helper";
import { extname } from "node:path";
import { PassThrough, type Readable } from "node:stream";

const INPUT_FORMAT_BY_EXT: Record<string, string> = {
  ".mkv": "matroska",
  ".webm": "matroska",
  ".mp4": "mp4",
  ".m4v": "mp4",
  ".mov": "mov",
  ".avi": "avi",
};

export function getVideoInputFormat(fileName: string): string | undefined {
  return INPUT_FORMAT_BY_EXT[extname(fileName).toLowerCase()];
}

/** Remux MKV only when we don't have a seekable file on disk (live torrent stream). */
export function shouldTranscodeForPlayback(fileName: string, hasFilePath = false): boolean {
  if (hasFilePath) return false;
  return fileName.toLowerCase().endsWith(".mkv");
}

function isStreamAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("aborted") ||
    message.includes("econnreset") ||
    message.includes("ecanceled") ||
    message.includes("epipe") ||
    message.includes("sigkill")
  );
}

export interface FragmentedMp4Stream {
  stream: NodeJS.ReadableStream;
  destroy: () => void;
}

export function convertToFragmentedMp4Stream(
  inputStream: NodeJS.ReadableStream,
  inputFormat?: string,
): FragmentedMp4Stream {
  const outputStream = new PassThrough();

  let command = ffmpeg(inputStream as Readable);
  if (inputFormat) {
    command = command.inputFormat(inputFormat);
  }

  command
    .inputOptions(["-probesize", "32M", "-analyzeduration", "10M", "-fflags", "+genpts+discardcorrupt"])
    .outputFormat("mp4")
    .outputOptions(["-c:v copy", "-c:a copy", "-movflags frag_keyframe+empty_moov+default_base_moof", "-f mp4"])
    .on("error", (err) => {
      if (isStreamAbortError(err)) return;
      logger.error("VIDEO", `Error converting to fragmented MP4: ${err}`);
      outputStream.destroy(err);
    });

  command.pipe(outputStream, { end: true });

  const destroy = (): void => {
    command.kill("SIGKILL");
    outputStream.destroy();
    if ("destroy" in inputStream && typeof inputStream.destroy === "function") {
      inputStream.destroy();
    }
  };

  return { stream: outputStream, destroy };
}
