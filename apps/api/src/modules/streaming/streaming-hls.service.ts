import { logger } from "@/helpers/logger.helper";
import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

const HLS_SEGMENT_DURATION = 6;
const SEGMENT_CACHE_TTL_MS = 30 * 60 * 1000;

interface HlsSession {
  downloadId: string;
  inputPath: string;
  duration: number;
  segmentCount: number;
  cacheDir: string;
  lastAccess: number;
}

const sessions = new Map<string, HlsSession>();

function getSessionDir(downloadId: string): string {
  return path.join(os.tmpdir(), `seedarr-hls-${downloadId}`);
}

async function ensureSessionDir(downloadId: string): Promise<string> {
  const dir = getSessionDir(downloadId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export function buildHlsPlaylist(duration: number, segmentCount: number): string {
  const lines: string[] = [
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    `#EXT-X-TARGETDURATION:${HLS_SEGMENT_DURATION + 1}`,
    "#EXT-X-PLAYLIST-TYPE:VOD",
    "#EXT-X-MEDIA-SEQUENCE:0",
  ];

  for (let i = 0; i < segmentCount; i++) {
    const isLast = i === segmentCount - 1;
    const segDuration = isLast ? duration - i * HLS_SEGMENT_DURATION : HLS_SEGMENT_DURATION;
    lines.push(`#EXTINF:${segDuration.toFixed(3)},`);
    lines.push(`${i}.ts`);
  }

  lines.push("#EXT-X-ENDLIST");
  return lines.join("\n");
}

export async function getOrCreateSession(downloadId: string, inputPath: string, duration: number): Promise<HlsSession> {
  const existing = sessions.get(downloadId);
  if (existing && existing.inputPath === inputPath) {
    existing.lastAccess = Date.now();
    return existing;
  }

  const cacheDir = await ensureSessionDir(downloadId);
  const segmentCount = Math.ceil(duration / HLS_SEGMENT_DURATION);

  const session: HlsSession = {
    downloadId,
    inputPath,
    duration,
    segmentCount,
    cacheDir,
    lastAccess: Date.now(),
  };

  sessions.set(downloadId, session);
  return session;
}

export async function generateSegment(session: HlsSession, index: number): Promise<Buffer> {
  session.lastAccess = Date.now();

  const cachedPath = path.join(session.cacheDir, `${index}.ts`);
  try {
    return await fs.readFile(cachedPath);
  } catch {
    // Not cached yet — generate
  }

  const startTime = index * HLS_SEGMENT_DURATION;
  const segmentDuration = Math.min(HLS_SEGMENT_DURATION + 1, session.duration - startTime + 1);

  const args = [
    "-ss",
    String(startTime),
    "-i",
    session.inputPath,
    "-t",
    String(segmentDuration),
    "-c:v",
    "copy",
    "-c:a",
    "copy",
    "-avoid_negative_ts",
    "make_zero",
    "-f",
    "mpegts",
    "-movflags",
    "+faststart",
    "pipe:1",
  ];

  return new Promise<Buffer>((resolve, reject) => {
    const ffmpeg: ChildProcess = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    let stderr = "";

    ffmpeg.stdout?.on("data", (chunk: Buffer) => chunks.push(chunk));
    ffmpeg.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    ffmpeg.on("error", (err) => {
      logger.error("HLS", `ffmpeg segment error: ${err.message}`);
      reject(err);
    });

    ffmpeg.on("close", async (code) => {
      if (code !== 0) {
        logger.error("HLS", `ffmpeg segment ${index} exited ${code}: ${stderr.slice(-200)}`);
        reject(new Error(`ffmpeg exited with code ${code}`));
        return;
      }

      const buffer = Buffer.concat(chunks);
      fs.writeFile(cachedPath, buffer).catch(() => {
        // Cache write failure is non-fatal
      });
      resolve(buffer);
    });
  });
}

export async function generateSegmentFromStream(
  inputStream: NodeJS.ReadableStream,
  inputFormat: string | undefined,
): Promise<Buffer> {
  const formatArgs = inputFormat ? ["-f", inputFormat] : [];
  const args = [
    ...formatArgs,
    "-i",
    "pipe:0",
    "-c:v",
    "copy",
    "-c:a",
    "copy",
    "-avoid_negative_ts",
    "make_zero",
    "-f",
    "mpegts",
    "pipe:1",
  ];

  return new Promise<Buffer>((resolve, reject) => {
    const ffmpeg: ChildProcess = spawn("ffmpeg", args, { stdio: ["pipe", "pipe", "pipe"] });
    const chunks: Buffer[] = [];

    if (ffmpeg.stdin) {
      inputStream.pipe(ffmpeg.stdin);
      ffmpeg.stdin.on("error", () => {
        /* ignore pipe errors */
      });
    }

    ffmpeg.stdout?.on("data", (chunk: Buffer) => chunks.push(chunk));
    ffmpeg.stderr?.on("data", () => {
      /* discard */
    });

    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg exited with code ${code}`));
        return;
      }
      resolve(Buffer.concat(chunks));
    });
  });
}

function cleanupSession(downloadId: string): void {
  const session = sessions.get(downloadId);
  if (!session) return;
  sessions.delete(downloadId);
  fs.rm(session.cacheDir, { recursive: true, force: true }).catch(() => {});
}

function startCleanupTimer(): NodeJS.Timeout {
  return setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now - session.lastAccess > SEGMENT_CACHE_TTL_MS) {
        logger.debug("HLS", `Cleaning up stale session: ${id}`);
        cleanupSession(id);
      }
    }
  }, 60_000);
}

startCleanupTimer();
