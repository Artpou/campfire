import { logger } from "@/helpers/logger.helper";
import { type ChildProcess, spawn } from "node:child_process";
import { extname } from "node:path";
import { PassThrough } from "node:stream";

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

/**
 * Remux MKV→fMP4 is disabled: it breaks seek/timeline (non-monotonic DTS).
 * Completed files are served from disk with HTTP ranges; live torrents use
 * WebTorrent range streams with native Matroska content-type.
 */
export function shouldTranscodeForPlayback(_fileName: string, _hasFilePath = false): boolean {
  return false;
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

  const args = [
    "-probesize",
    "32M",
    "-analyzeduration",
    "10M",
    "-fflags",
    "+genpts+discardcorrupt",
    ...(inputFormat ? ["-f", inputFormat] : []),
    "-i",
    "pipe:0",
    "-c:v",
    "copy",
    "-c:a",
    "copy",
    "-movflags",
    "frag_keyframe+empty_moov+default_base_moof",
    "-f",
    "mp4",
    "pipe:1",
  ];

  const ffmpeg: ChildProcess = spawn("ffmpeg", args, {
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (ffmpeg.stdin) {
    (inputStream as NodeJS.ReadableStream).pipe(ffmpeg.stdin);
    ffmpeg.stdin.on("error", (err) => {
      if (isStreamAbortError(err)) return;
      logger.error("VIDEO", `ffmpeg stdin error: ${err.message}`);
    });
  }

  if (ffmpeg.stdout) {
    ffmpeg.stdout.pipe(outputStream, { end: true });
  }

  if (ffmpeg.stderr) {
    ffmpeg.stderr.on("data", (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) logger.debug("FFMPEG", msg);
    });
  }

  ffmpeg.on("error", (err) => {
    if (isStreamAbortError(err)) return;
    logger.error("VIDEO", `ffmpeg process error: ${err.message}`);
    outputStream.destroy(err);
  });

  ffmpeg.on("close", (code) => {
    if (code && code !== 0 && code !== 255) {
      logger.error("VIDEO", `ffmpeg exited with code ${code}`);
    }
    outputStream.end();
  });

  const destroy = (): void => {
    ffmpeg.kill("SIGKILL");
    outputStream.destroy();
    if ("destroy" in inputStream && typeof inputStream.destroy === "function") {
      (inputStream as { destroy: () => void }).destroy();
    }
  };

  return { stream: outputStream, destroy };
}
