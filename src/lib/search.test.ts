import { describe, expect, it } from "vitest";
import { getAllDatasets } from "./datasets";
import { EMPTY_FILTERS, filterDatasets, getFilterOptions } from "./search";

const datasets = getAllDatasets();

describe("filterDatasets", () => {
  it("searches dataset formats", () => {
    const results = filterDatasets(datasets, {
      ...EMPTY_FILTERS,
      query: "GeoTIFF",
    });

    expect(results.map((dataset) => dataset.id)).toContain("natural-earth");
  });

  it("builds sorted, de-duplicated filter options", () => {
    const options = getFilterOptions(datasets);
    expect(options.domains).toContain("Biology");
    expect(options.sizes).toEqual([
      "Tiny",
      "Small",
      "Medium",
      "Large",
      "Very Large",
      "Massive",
    ]);
    for (const values of Object.values(options)) {
      expect(values).toEqual([...new Set(values)]);
    }
  });

  it("combines all filters and supports blank search text", () => {
    const iris = datasets.find((dataset) => dataset.id === "iris")!;
    expect(
      filterDatasets(datasets, {
        query: "   ",
        domains: [iris.domains[0]!],
        dataTypes: [iris.data_types[0]!],
        tasks: [iris.tasks[0]!],
        difficulties: [iris.difficulty],
        sizes: ["Tiny"],
        formats: [iris.formats[0]!],
        apiKeyRequired: false,
        geographies: [iris.geography[0]!],
      }).map((dataset) => dataset.id),
    ).toContain("iris");
  });

  it("rejects each mismatched filter independently", () => {
    const mismatches = [
      { domains: ["does-not-exist"] },
      { dataTypes: ["does-not-exist"] },
      { tasks: ["does-not-exist"] },
      { difficulties: ["does-not-exist"] },
      { formats: ["does-not-exist"] },
      { geographies: ["does-not-exist"] },
      { sizes: ["Large" as const] },
      { apiKeyRequired: true },
    ];

    for (const mismatch of mismatches) {
      expect(
        filterDatasets(datasets, { ...EMPTY_FILTERS, ...mismatch }),
      ).toEqual([]);
    }
  });
});
