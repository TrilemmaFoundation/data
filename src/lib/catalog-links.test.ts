import { describe, expect, it } from "vitest";
import { catalogHref } from "./catalog-links";
import { EMPTY_FILTERS } from "./search";

describe("catalog links", () => {
  it("builds the unfiltered catalog href", () => {
    expect(catalogHref()).toBe("/");
    expect(catalogHref(EMPTY_FILTERS)).toBe("/");
  });

  it("serializes filter state onto the catalog path", () => {
    expect(
      catalogHref({
        ...EMPTY_FILTERS,
        theme: "Environment & Hazards",
        domains: ["Natural Hazards"],
      }),
    ).toBe("/?theme=Environment+%26+Hazards&domain=Natural+Hazards");
  });
});
