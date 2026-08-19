import { describe, expect, it } from "vitest";

import { actionsForCategory, addonActionFromPatch, sanitizeActivityMetadata } from "./activity.helper";

describe("activity.helper", () => {
  it("strips secrets from metadata", () => {
    expect(
      sanitizeActivityMetadata({
        url: "http://localhost",
        apiKey: "secret",
        password: "p",
        nested: { token: "t", host: "nas" },
        magnetUri: "magnet:?xt=urn:btih:abc",
      }),
    ).toEqual({
      url: "http://localhost",
      nested: { host: "nas" },
    });
  });

  it("maps addon patch to enable/disable/modify", () => {
    expect(addonActionFromPatch(true)).toBe("ADDON_ENABLE");
    expect(addonActionFromPatch(false)).toBe("ADDON_DISABLE");
    expect(addonActionFromPatch(undefined)).toBe("ADDON_MODIFY");
  });

  it("groups actions by category", () => {
    expect(actionsForCategory("user")).toContain("USER_LOGIN");
    expect(actionsForCategory("download")).toContain("DOWNLOAD_START");
    expect(actionsForCategory("module")).toEqual(expect.arrayContaining(["ADDON_ENABLE", "REMOTE_SYNC"]));
    expect(actionsForCategory("others")).toContain("MEDIA_WATCH");
  });
});
