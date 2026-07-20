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

/** Remux MKV→fMP4 so browsers can play it. Seek = restart stream with startSeconds. */
export function shouldTranscodeForPlayback(fileName: string): boolean {
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

export type RemuxInput = { filePath: string } | { stream: NodeJS.ReadableStream };

/** Probe duration in seconds via ffprobe. Returns undefined if unavailable. */
export async function probeVideoDuration(input: RemuxInput): Promise<number | undefined> {
  return new Promise((resolve) => {
    const args =
      "filePath" in input
        ? ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", input.filePath]
        : ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", "-i", "pipe:0"];

    const ffprobe = spawn("ffprobe", args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let settled = false;

    const finish = (value: number | undefined): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    const timer = setTimeout(() => {
      ffprobe.kill("SIGKILL");
      finish(undefined);
    }, 15_000);

    if (!("filePath" in input) && ffprobe.stdin) {
      input.stream.pipe(ffprobe.stdin);
      input.stream.on("error", () => finish(undefined));
    }

    ffprobe.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    ffprobe.on("error", () => finish(undefined));
    ffprobe.on("close", () => {
      const parsed = Number.parseFloat(stdout.trim());
      finish(Number.isFinite(parsed) && parsed > 0 ? parsed : undefined);
    });
  });
}

export function convertToFragmentedMp4Stream(
  input: RemuxInput,
  options?: { inputFormat?: string; startSeconds?: number },
): FragmentedMp4Stream {
  const outputStream = new PassThrough();
  const startSeconds = options?.startSeconds && options.startSeconds > 0 ? options.startSeconds : undefined;
  const inputFormat = options?.inputFormat;

  const seekArgs = startSeconds != null ? ["-ss", String(startSeconds)] : [];
  const formatArgs = inputFormat ? ["-f", inputFormat] : [];

  // Prefer file input when possible — -ss before -i seeks efficiently.
  const inputArgs =
    "filePath" in input
      ? [...seekArgs, ...formatArgs, "-i", input.filePath]
      : [...formatArgs, "-i", "pipe:0", ...seekArgs];

  const args = [
    "-probesize",
    "32M",
    "-analyzeduration",
    "10M",
    "-fflags",
    "+genpts+discardcorrupt",
    ...inputArgs,
    "-c:v",
    "copy",
    "-c:a",
    "copy",
    "-avoid_negative_ts",
    "make_zero",
    "-movflags",
    "frag_keyframe+empty_moov+default_base_moof",
    "-f",
    "mp4",
    "pipe:1",
  ];

  const ffmpeg: ChildProcess = spawn("ffmpeg", args, { stdio: ["pipe", "pipe", "pipe"] });

  if (!("filePath" in input) && ffmpeg.stdin) {
    input.stream.pipe(ffmpeg.stdin);
    ffmpeg.stdin.on("error", (err) => {
      if (!isStreamAbortError(err)) logger.error("VIDEO", `ffmpeg stdin error: ${err.message}`);
    });
  }

  ffmpeg.stdout?.pipe(outputStream, { end: true });

  ffmpeg.stderr?.on("data", (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg) logger.debug("FFMPEG", msg);
  });

  ffmpeg.on("error", (err) => {
    if (isStreamAbortError(err)) return;
    logger.error("VIDEO", `ffmpeg process error: ${err.message}`);
    outputStream.destroy(err);
  });

  ffmpeg.on("close", (code) => {
    if (code && code !== 0 && code !== 255) logger.error("VIDEO", `ffmpeg exited with code ${code}`);
    outputStream.end();
  });

  const destroy = (): void => {
    ffmpeg.kill("SIGKILL");
    outputStream.destroy();
    if (!("filePath" in input) && "destroy" in input.stream && typeof input.stream.destroy === "function") {
      input.stream.destroy();
    }
  };

  return { stream: outputStream, destroy };
}
