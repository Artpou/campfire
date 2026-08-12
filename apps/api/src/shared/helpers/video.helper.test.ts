import { afterEach, describe, expect, it, vi } from "vitest";

import { EventEmitter } from "node:events";
import { PassThrough, Readable } from "node:stream";

const { spawnMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  spawn: spawnMock,
}));

const { convertToFragmentedMp4Stream, getVideoInputFormat, probeVideoDuration, probeVideoStreams } = await import(
  "./video.helper"
);

function mockChild(options?: { stdout?: string; exitCode?: number; emitError?: Error }) {
  const child = new EventEmitter() as EventEmitter & {
    stdin: PassThrough;
    stdout: PassThrough;
    stderr: PassThrough;
    kill: ReturnType<typeof vi.fn>;
  };
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = vi.fn();

  queueMicrotask(() => {
    if (options?.emitError) {
      child.emit("error", options.emitError);
      return;
    }
    if (options?.stdout != null) {
      child.stdout.push(Buffer.from(options.stdout));
      child.stdout.push(null);
    }
    child.emit("close", options?.exitCode ?? 0);
  });

  return child;
}

afterEach(() => {
  spawnMock.mockReset();
});

describe("getVideoInputFormat", () => {
  it("maps common extensions", () => {
    expect(getVideoInputFormat("a.mkv")).toBe("matroska");
    expect(getVideoInputFormat("a.MP4")).toBe("mp4");
    expect(getVideoInputFormat("a.mov")).toBe("mov");
    expect(getVideoInputFormat("a.txt")).toBeUndefined();
  });
});

describe("probeVideoStreams", () => {
  it("parses ffprobe JSON for file input", async () => {
    spawnMock.mockImplementation(() =>
      mockChild({
        stdout: JSON.stringify({
          streams: [
            { codec_type: "video", codec_name: "hevc", duration: "120.5" },
            { codec_type: "audio", codec_name: "aac" },
          ],
          format: { duration: "120.5" },
        }),
      }),
    );

    const probe = await probeVideoStreams({ filePath: "/tmp/movie.mkv" });
    expect(probe).toEqual({ videoCodec: "hevc", audioCodec: "aac", duration: 120.5 });
    expect(spawnMock).toHaveBeenCalledWith(
      "ffprobe",
      expect.arrayContaining(["-i", "/tmp/movie.mkv"]),
      expect.any(Object),
    );
  });

  it("returns null on invalid JSON / empty probe", async () => {
    spawnMock.mockImplementation(() => mockChild({ stdout: "not-json" }));
    await expect(probeVideoStreams({ filePath: "/tmp/x.mkv" })).resolves.toBeNull();

    spawnMock.mockImplementation(() => mockChild({ stdout: JSON.stringify({ streams: [] }) }));
    await expect(probeVideoStreams({ filePath: "/tmp/x.mkv" })).resolves.toBeNull();
  });

  it("returns null when ffprobe fails to spawn", async () => {
    spawnMock.mockImplementation(() => mockChild({ emitError: new Error("ENOENT") }));
    await expect(probeVideoStreams({ filePath: "/tmp/x.mkv" })).resolves.toBeNull();
  });

  it("supports pipe input and probeVideoDuration wrapper", async () => {
    spawnMock.mockImplementation(() =>
      mockChild({
        stdout: JSON.stringify({
          streams: [{ codec_type: "video", codec_name: "h264" }],
          format: { duration: "42" },
        }),
      }),
    );

    const stream = Readable.from([Buffer.from("fake")]);
    const duration = await probeVideoDuration({ stream });
    expect(duration).toBe(42);
  });
});

describe("convertToFragmentedMp4Stream", () => {
  it("spawns ffmpeg and exposes destroy", async () => {
    const child = mockChild({ exitCode: 0 });
    spawnMock.mockReturnValue(child);

    const remuxed = convertToFragmentedMp4Stream(
      { filePath: "/tmp/movie.mkv" },
      { inputFormat: "matroska", video: "copy", audio: "aac", startSeconds: 10 },
    );

    expect(spawnMock).toHaveBeenCalledWith(
      "ffmpeg",
      expect.arrayContaining(["-ss", "10", "-f", "matroska", "-i", "/tmp/movie.mkv", "-c:a", "aac"]),
      expect.any(Object),
    );

    remuxed.destroy();
    expect(child.kill).toHaveBeenCalledWith("SIGKILL");
  });

  it("pipes stream input into ffmpeg stdin", () => {
    const child = mockChild({ exitCode: 0 });
    spawnMock.mockReturnValue(child);
    const input = Readable.from([Buffer.from("data")]);

    convertToFragmentedMp4Stream({ stream: input }, { video: "libx264", audio: "copy" });
    expect(spawnMock).toHaveBeenCalledWith(
      "ffmpeg",
      expect.arrayContaining(["-i", "pipe:0", "-c:v", "libx264"]),
      expect.any(Object),
    );
  });
});
