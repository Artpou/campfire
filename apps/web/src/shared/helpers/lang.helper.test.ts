import { describe, expect, it } from "vitest";

import { detectLanguage, getFlagUrl } from "./lang.helper";

describe("lang.helper", () => {
  it("detects languages from codes and names", () => {
    expect(detectLanguage(null)).toBeNull();
    expect(detectLanguage("en")?.name).toMatch(/English/i);
    expect(detectLanguage("fra")?.["1"]).toBe("fr");
  });

  it("builds flag urls with exceptions", () => {
    expect(getFlagUrl()).toBe("");
    expect(getFlagUrl("en")).toContain("/us.svg");
    expect(getFlagUrl("ja")).toContain("/jp.svg");
    expect(getFlagUrl("fr")).toContain("/fr.svg");
  });
});
