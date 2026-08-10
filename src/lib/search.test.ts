import { describe, expect, it } from "vitest";
import { getAllDatasets } from "./datasets";
import { EMPTY_FILTERS, filterDatasets } from "./search";

describe("filterDatasets", () => {
  it("searches dataset formats", () => {
    const results = filterDatasets(getAllDatasets(), {
      ...EMPTY_FILTERS,
      query: "GeoTIFF",
    });

    expect(results.map((dataset) => dataset.id)).toContain("natural-earth");
  });
});
