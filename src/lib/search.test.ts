import { describe, expect, it } from "vitest";
import { getAllDatasets } from "./datasets";
import { EMPTY_FILTERS, filterDatasets, getFilterOptions } from "./search";

const datasets = getAllDatasets();
const earthquakeCatalog = datasets.find(
  (dataset) => dataset.id === "usgs-earthquakes",
)!;

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
    expect(options.domains).toContain("Natural Hazards");
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
    expect(
      filterDatasets(datasets, {
        query: "   ",
        domains: [earthquakeCatalog.domains[0]!],
        dataTypes: [earthquakeCatalog.data_types[0]!],
        tasks: [earthquakeCatalog.tasks[0]!],
        difficulties: [earthquakeCatalog.difficulty],
        sizes: ["Small"],
        formats: [earthquakeCatalog.formats[0]!],
        apiKeyRequired: false,
        geographies: [earthquakeCatalog.geography[0]!],
      }).map((dataset) => dataset.id),
    ).toContain("usgs-earthquakes");
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
        filterDatasets([earthquakeCatalog], { ...EMPTY_FILTERS, ...mismatch }),
      ).toEqual([]);
    }
  });
});
