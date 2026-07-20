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

export type FfmpegCodec = "copy" | "libx264" | "aac";

export interface VideoProbe {
  duration: number | undefined;
  videoCodec: string | undefined;
  audioCodec: string | undefined;
}

export function getVideoInputFormat(fileName: string): string | undefined {
  return INPUT_FORMAT_BY_EXT[extname(fileName).toLowerCase()];
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
  const probe = await probeVideoStreams(input);
  return probe?.duration;
}

function parseProbeDuration(
  formatDuration: string | undefined,
  streams: Array<{ duration?: string }>,
): number | undefined {
  const fromFormat = Number.parseFloat(formatDuration ?? "");
  if (Number.isFinite(fromFormat) && fromFormat > 0) return fromFormat;
  for (const stream of streams) {
    const fromStream = Number.parseFloat(stream.duration ?? "");
    if (Number.isFinite(fromStream) && fromStream > 0) return fromStream;
  }
  return undefined;
}

/** Full stream probe (codecs + duration) via ffprobe JSON. */
export async function probeVideoStreams(input: RemuxInput): Promise<VideoProbe | null> {
  return new Promise((resolve) => {
    const common = [
      "-v",
      "error",
      "-probesize",
      "32M",
      "-analyzeduration",
      "10M",
      "-show_entries",
      "stream=codec_type,codec_name,duration:format=duration",
      "-of",
      "json",
    ];
    const args = "filePath" in input ? [...common, "-i", input.filePath] : [...common, "-i", "pipe:0"];

    const ffprobe = spawn("ffprobe", args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (value: VideoProbe | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!("filePath" in input) && "destroy" in input.stream && typeof input.stream.destroy === "function") {
        input.stream.destroy();
      }
      resolve(value);
    };

    const timer = setTimeout(() => {
      ffprobe.kill("SIGKILL");
      finish(null);
    }, 30_000);

    if (!("filePath" in input) && ffprobe.stdin) {
      input.stream.pipe(ffprobe.stdin);
      input.stream.on("error", () => finish(null));
      ffprobe.stdin.on("error", () => {
        // EPIPE when ffprobe exits early after reading headers — expected.
      });
    }

    ffprobe.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    ffprobe.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    ffprobe.on("error", () => finish(null));
    ffprobe.on("close", () => {
      try {
        const parsed = JSON.parse(stdout) as {
          streams?: Array<{ codec_type?: string; codec_name?: string; duration?: string }>;
          format?: { duration?: string };
        };
        const streams = parsed.streams ?? [];
        const video = streams.find((s) => s.codec_type === "video");
        const audio = streams.find((s) => s.codec_type === "audio");
        const duration = parseProbeDuration(parsed.format?.duration, streams);
        if (!video?.codec_name && !audio?.codec_name && duration == null) {
          if (stderr.trim()) logger.debug("VIDEO", `ffprobe empty result: ${stderr.trim().slice(0, 300)}`);
          finish(null);
          return;
        }
        finish({
          videoCodec: video?.codec_name,
          audioCodec: audio?.codec_name,
          duration,
        });
      } catch {
        if (stderr.trim()) logger.debug("VIDEO", `ffprobe parse failed: ${stderr.trim().slice(0, 300)}`);
        finish(null);
      }
    });
  });
}

/** Live remux of progressive containers to fragmented MP4 for browser playback while downloading. */
export function convertToFragmentedMp4Stream(
  input: RemuxInput,
  options?: {
    inputFormat?: string;
    startSeconds?: number;
    video?: FfmpegCodec;
    audio?: FfmpegCodec;
  },
): FragmentedMp4Stream {
  const outputStream = new PassThrough();
  const startSeconds = options?.startSeconds && options.startSeconds > 0 ? options.startSeconds : undefined;
  const inputFormat = options?.inputFormat;
  const videoCodec = options?.video ?? "copy";
  const audioCodec = options?.audio ?? "copy";

  const seekArgs = startSeconds != null ? ["-ss", String(startSeconds)] : [];
  const formatArgs = inputFormat ? ["-f", inputFormat] : [];

  const inputArgs =
    "filePath" in input
      ? [...seekArgs, ...formatArgs, "-i", input.filePath]
      : [...formatArgs, "-i", "pipe:0", ...seekArgs];

  const videoArgs =
    videoCodec === "libx264" ? ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23"] : ["-c:v", "copy"];
  const audioArgs = audioCodec === "aac" ? ["-c:a", "aac", "-ac", "2", "-b:a", "192k"] : ["-c:a", "copy"];

  const args = [
    "-probesize",
    "32M",
    "-analyzeduration",
    "10M",
    "-fflags",
    "+genpts+discardcorrupt",
    ...inputArgs,
    ...videoArgs,
    ...audioArgs,
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
