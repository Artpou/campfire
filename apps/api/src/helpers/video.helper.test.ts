import { describe, expect, it } from "vitest";

import { buildHlsFfmpegCodecArgs, getVideoInputFormat, resolvePlaybackPlan } from "./video.helper";

describe("getVideoInputFormat", () => {
  it("maps mkv to matroska", () => {
    expect(getVideoInputFormat("movie.mkv")).toBe("matroska");
  });

  it("maps mp4 to mp4", () => {
    expect(getVideoInputFormat("movie.mp4")).toBe("mp4");
  });
});

describe("resolvePlaybackPlan", () => {
  it("direct: MP4 H.264 + AAC with moov at start", () => {
    expect(resolvePlaybackPlan("movie.mp4", { videoCodec: "h264", audioCodec: "aac" }, { moovAtStart: true })).toEqual({
      mode: "direct",
      video: "copy",
      audio: "copy",
    });
  });

  it("hls + aac: MP4 H.264 + AC3", () => {
    expect(resolvePlaybackPlan("movie.mp4", { videoCodec: "h264", audioCodec: "ac3" }, { moovAtStart: true })).toEqual({
      mode: "hls",
      video: "copy",
      audio: "aac",
    });
  });

  it("hls + full transcode: MP4 HEVC + AAC", () => {
    expect(resolvePlaybackPlan("movie.mp4", { videoCodec: "hevc", audioCodec: "aac" }, { moovAtStart: true })).toEqual({
      mode: "hls",
      video: "libx264",
      audio: "copy",
    });
  });

  it("hls when moov at end", () => {
    expect(resolvePlaybackPlan("movie.mp4", { videoCodec: "h264", audioCodec: "aac" }, { moovAtStart: false })).toEqual(
      { mode: "hls", video: "copy", audio: "copy" },
    );
  });

  it("hls remux: MKV H.264 + AAC", () => {
    expect(resolvePlaybackPlan("movie.mkv", { videoCodec: "h264", audioCodec: "aac" })).toEqual({
      mode: "hls",
      video: "copy",
      audio: "copy",
    });
  });

  it("hls audio transcode: MKV H.264 + DTS", () => {
    expect(resolvePlaybackPlan("movie.mkv", { videoCodec: "h264", audioCodec: "dts" })).toEqual({
      mode: "hls",
      video: "copy",
      audio: "aac",
    });
  });

  it("live for incomplete torrent forces aac when audio unsafe", () => {
    expect(
      resolvePlaybackPlan("movie.mkv", { videoCodec: "h264", audioCodec: "ac3" }, { hasCompleteFile: false }),
    ).toEqual({ mode: "live", video: "copy", audio: "aac" });
  });
});

describe("buildHlsFfmpegCodecArgs", () => {
  it("copies both when remux", () => {
    expect(buildHlsFfmpegCodecArgs({ video: "copy", audio: "copy" })).toEqual(["-c:v", "copy", "-c:a", "copy"]);
  });

  it("transcodes audio to aac", () => {
    expect(buildHlsFfmpegCodecArgs({ video: "copy", audio: "aac" })).toEqual([
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-ac",
      "2",
      "-b:a",
      "192k",
    ]);
  });
});
