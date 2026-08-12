import { describe, expect, it } from "vitest";

import { translateDownloadError } from "./download-error.helper";

describe("translateDownloadError", () => {
  it("translates known messages and passes through others", () => {
    expect(translateDownloadError("Torrent is not paused")).toBeTruthy();
    expect(translateDownloadError("No magnet URI found")).toBeTruthy();
    expect(translateDownloadError("Custom failure")).toBe("Custom failure");
  });
});
