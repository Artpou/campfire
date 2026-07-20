import { logger } from "@/helpers/logger.helper";
import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs/promises";
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

/** H.264 only for reliable cross-browser MP4 direct (Chrome lacks HEVC). */
const DIRECT_VIDEO = new Set(["h264", "avc1"]);
const DIRECT_AUDIO = new Set(["aac", "mp3"]);

export type FfmpegCodec = "copy" | "libx264" | "aac";

export interface VideoProbe {
  duration: number | undefined;
  videoCodec: string | undefined;
  audioCodec: string | undefined;
}

export interface PlaybackPlan {
  /** direct = byte-range file, hls = segmented VOD, live = continuous fMP4 remux */
  mode: "direct" | "hls" | "live";
  video: FfmpegCodec;
  audio: FfmpegCodec;
}

export function getVideoInputFormat(fileName: string): string | undefined {
  return INPUT_FORMAT_BY_EXT[extname(fileName).toLowerCase()];
}

function normalizeCodec(codec: string | undefined): string | undefined {
  if (!codec) return undefined;
  return codec.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Decide playback strategy from container + probed codecs (+ optional moov check).
 * Falls back to extension heuristics when probe is unavailable.
 */
export function resolvePlaybackPlan(
  fileName: string,
  probe: Pick<VideoProbe, "videoCodec" | "audioCodec"> | null,
  options?: { moovAtStart?: boolean; hasCompleteFile?: boolean },
): PlaybackPlan {
  const ext = extname(fileName).toLowerCase();
  const hasFile = options?.hasCompleteFile ?? true;
  const videoCodec = normalizeCodec(probe?.videoCodec);
  const audioCodec = normalizeCodec(probe?.audioCodec);

  // Incomplete torrent: continuous remux — keep video copy (CPU), force AAC when audio unknown/unsafe.
  if (!hasFile) {
    const liveAudio: FfmpegCodec = audioCodec && DIRECT_AUDIO.has(audioCodec) ? "copy" : "aac";
    return { mode: "live", video: "copy", audio: liveAudio };
  }

  // HLS codec args: copy H.264, re-encode anything else; AAC for non-web audio.
  const hlsVideo: FfmpegCodec = videoCodec && DIRECT_VIDEO.has(videoCodec) ? "copy" : videoCodec ? "libx264" : "copy";
  const hlsAudio: FfmpegCodec = audioCodec && DIRECT_AUDIO.has(audioCodec) ? "copy" : "aac";

  // Direct MP4: H.264 + AAC/MP3 + moov at start.
  if (ext === ".mp4" || ext === ".m4v") {
    const canDirect =
      probe != null &&
      videoCodec != null &&
      DIRECT_VIDEO.has(videoCodec) &&
      (audioCodec == null || DIRECT_AUDIO.has(audioCodec)) &&
      options?.moovAtStart !== false;
    if (canDirect) return { mode: "direct", video: "copy", audio: "copy" };
    if (!probe) return { mode: "direct", video: "copy", audio: "copy" }; // legacy fallback
    return { mode: "hls", video: hlsVideo, audio: hlsAudio };
  }

  // Direct WebM: VP8/VP9/AV1 + Opus/Vorbis.
  if (ext === ".webm") {
    const webmVideoOk = videoCodec != null && (videoCodec === "vp8" || videoCodec === "vp9" || videoCodec === "av1");
    const webmAudioOk = audioCodec == null || audioCodec === "opus" || audioCodec === "vorbis";
    if (probe && webmVideoOk && webmAudioOk) return { mode: "direct", video: "copy", audio: "copy" };
    if (!probe) return { mode: "direct", video: "copy", audio: "copy" };
    return { mode: "hls", video: hlsVideo, audio: hlsAudio };
  }

  // Extension-only fallback (no probe): MKV/AVI → HLS with AAC.
  if (!probe) {
    if (ext === ".mkv" || ext === ".avi" || ext === ".mov") {
      return { mode: "hls", video: "copy", audio: "aac" };
    }
    return { mode: "direct", video: "copy", audio: "copy" };
  }

  // MKV / AVI / MOV / exotic → HLS with selective transcode.
  return { mode: "hls", video: hlsVideo, audio: hlsAudio };
}

/** True if `moov` appears before `mdat` in the first 256 KiB (faststart-friendly). */
export async function hasMoovAtStart(filePath: string): Promise<boolean> {
  try {
    const handle = await fs.open(filePath, "r");
    try {
      const buf = Buffer.alloc(256 * 1024);
      const { bytesRead } = await handle.read(buf, 0, buf.length, 0);
      const latin = buf.subarray(0, bytesRead).toString("latin1");
      const moov = latin.indexOf("moov");
      const mdat = latin.indexOf("mdat");
      if (moov === -1) return false;
      if (mdat === -1) return true;
      return moov < mdat;
    } finally {
      await handle.close();
    }
  } catch {
    return false;
  }
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

/** Full stream probe (codecs + duration) via ffprobe JSON. */
export async function probeVideoStreams(input: RemuxInput): Promise<VideoProbe | null> {
  return new Promise((resolve) => {
    const args =
      "filePath" in input
        ? [
            "-v",
            "error",
            "-show_entries",
            "stream=codec_type,codec_name:format=duration",
            "-of",
            "json",
            input.filePath,
          ]
        : [
            "-v",
            "error",
            "-show_entries",
            "stream=codec_type,codec_name:format=duration",
            "-of",
            "json",
            "-i",
            "pipe:0",
          ];

    const ffprobe = spawn("ffprobe", args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let settled = false;

    const finish = (value: VideoProbe | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    const timer = setTimeout(() => {
      ffprobe.kill("SIGKILL");
      finish(null);
    }, 15_000);

    if (!("filePath" in input) && ffprobe.stdin) {
      input.stream.pipe(ffprobe.stdin);
      input.stream.on("error", () => finish(null));
    }

    ffprobe.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    ffprobe.on("error", () => finish(null));
    ffprobe.on("close", () => {
      try {
        const parsed = JSON.parse(stdout) as {
          streams?: Array<{ codec_type?: string; codec_name?: string }>;
          format?: { duration?: string };
        };
        const streams = parsed.streams ?? [];
        const video = streams.find((s) => s.codec_type === "video");
        const audio = streams.find((s) => s.codec_type === "audio");
        const durationRaw = Number.parseFloat(parsed.format?.duration ?? "");
        finish({
          videoCodec: video?.codec_name,
          audioCodec: audio?.codec_name,
          duration: Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : undefined,
        });
      } catch {
        finish(null);
      }
    });
  });
}

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

/** FFmpeg args for HLS MPEG-TS segments based on codec plan. */
export function buildHlsFfmpegCodecArgs(plan: Pick<PlaybackPlan, "video" | "audio">): string[] {
  const videoArgs =
    plan.video === "libx264" ? ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23"] : ["-c:v", "copy"];
  const audioArgs = plan.audio === "aac" ? ["-c:a", "aac", "-ac", "2", "-b:a", "192k"] : ["-c:a", "copy"];
  return [...videoArgs, ...audioArgs];
}
