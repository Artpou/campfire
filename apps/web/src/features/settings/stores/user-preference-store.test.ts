import { beforeEach, describe, expect, it } from "vitest";

import { useUserPreferences } from "./user-preference-store";

describe("user-preference-store", () => {
  beforeEach(() => {
    useUserPreferences.setState({
      quality: null,
      maxSize: null,
      viewMode: "grid",
      showCategories: false,
    });
  });

  it("updates preference fields", () => {
    useUserPreferences.getState().setQuality("1080p" as never);
    useUserPreferences.getState().setMaxSize(5);
    useUserPreferences.getState().setViewMode("list");
    useUserPreferences.getState().setShowCategories(true);

    const state = useUserPreferences.getState();
    expect(state.quality).toBe("1080p");
    expect(state.maxSize).toBe(5);
    expect(state.viewMode).toBe("list");
    expect(state.showCategories).toBe(true);
  });
});
