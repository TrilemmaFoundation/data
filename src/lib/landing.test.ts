import { describe, expect, it } from "vitest";
import { DATASET_THEMES } from "./schema";
import { allThemeSlugs, themeFromSlug, themePath, themeSlug } from "./landing";

describe("theme landings", () => {
  it("round-trips every catalog theme slug", () => {
    expect(allThemeSlugs()).toHaveLength(DATASET_THEMES.length);
    for (const theme of DATASET_THEMES) {
      const slug = themeSlug(theme);
      expect(themeFromSlug(slug)).toBe(theme);
      expect(themePath(theme)).toBe(`/themes/${slug}`);
    }
    expect(themeFromSlug("missing")).toBeNull();
  });
});
