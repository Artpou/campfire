import { describe, expect, it } from "vitest";

import { getVideoInputFormat, shouldTranscodeForPlayback } from "./video.helper";

describe("getVideoInputFormat", () => {
  it("maps mkv to matroska", () => {
    expect(getVideoInputFormat("movie.mkv")).toBe("matroska");
  });

  it("maps mp4 to mp4", () => {
    expect(getVideoInputFormat("movie.mp4")).toBe("mp4");
  });
});

describe("shouldTranscodeForPlayback", () => {
  it("transcodes mkv live streams without a file path", () => {
    expect(shouldTranscodeForPlayback("movie.mkv")).toBe(true);
  });

  it("does not transcode mkv when a seekable file is available", () => {
    expect(shouldTranscodeForPlayback("movie.mkv", true)).toBe(false);
  });

  it("does not transcode mp4", () => {
    expect(shouldTranscodeForPlayback("movie.mp4")).toBe(false);
  });
});
