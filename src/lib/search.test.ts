import { describe, expect, it } from "vitest";
import type { CatalogDataset } from "./schema";
import { getAllDatasets } from "./datasets";
import {
  compareDatasets,
  EMPTY_FILTERS,
  filterDatasets,
  getDatasetAccessMethods,
  getFilterOptions,
  sortDatasets,
} from "./search";

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

  it("searches broad themes and retained detailed tags", () => {
    expect(filterDatasets(datasets, { ...EMPTY_FILTERS, query: "cybersecurity" }))
      .toContainEqual(expect.objectContaining({ id: "cisa-known-exploited-vulnerabilities" }));
    expect(filterDatasets(datasets, { ...EMPTY_FILTERS, query: "seismology" }))
      .toContainEqual(expect.objectContaining({ id: "usgs-earthquakes" }));
    expect(filterDatasets(datasets, { ...EMPTY_FILTERS, query: "hazard monitoring" }))
      .toContainEqual(expect.objectContaining({ id: "usgs-earthquakes" }));
  });

  it("builds sorted, de-duplicated filter options", () => {
    const options = getFilterOptions(datasets);
    expect(options.domains).toContain("Natural Hazards");
    expect(options.themes).toContain("Environment & Hazards");
    expect(options.themes).toEqual([...options.themes].sort((a, b) => a.localeCompare(b)));
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
    expect(getFilterOptions([]).accessMethods).toEqual([]);
  });

  it("combines all filters and supports blank search text", () => {
    expect(
      filterDatasets(datasets, {
        ...EMPTY_FILTERS,
        query: "   ",
        theme: earthquakeCatalog.theme,
        accessMethod: "api",
        domains: [earthquakeCatalog.domains[0]!],
        dataTypes: [earthquakeCatalog.data_types[0]!],
        tasks: [earthquakeCatalog.tasks[0]!],
        difficulty: earthquakeCatalog.difficulty,
        sizes: ["Small"],
        formats: [earthquakeCatalog.formats[0]!],
        apiKeyRequired: false,
        geographies: [earthquakeCatalog.geography[0]!],
      }).map((dataset) => dataset.id),
    ).toContain("usgs-earthquakes");
  });

  it("rejects each mismatched filter independently", () => {
    const mismatches = [
      { theme: "Government & Policy" as const },
      { domains: ["does-not-exist"] },
      { dataTypes: ["does-not-exist"] },
      { tasks: ["does-not-exist"] },
      { difficulty: "intermediate" as const },
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

  it("normalizes both access encodings", () => {
    const both: CatalogDataset = { ...earthquakeCatalog, access_type: ["both"] };
    expect(getDatasetAccessMethods(earthquakeCatalog)).toEqual(["api", "download"]);
    expect(getDatasetAccessMethods(both)).toEqual(["api", "download"]);
    const apiOnly = datasets.find((dataset) => dataset.id === "nws-weather-api")!;
    expect(getDatasetAccessMethods(apiOnly)).toEqual(["api"]);
    const downloadOnly = datasets.find(
      (dataset) => dataset.id === "cisa-known-exploited-vulnerabilities",
    )!;
    expect(getDatasetAccessMethods(downloadOnly)).toEqual(["download"]);
    expect(filterDatasets([apiOnly], { ...EMPTY_FILTERS, accessMethod: "download" }))
      .toEqual([]);
  });

  it("sorts with semantic ordering and stable name tie-breakers", () => {
    expect(sortDatasets(datasets, null)).toBe(datasets);
    for (const column of ["name", "theme", "access", "difficulty", "updates"] as const) {
      const sorted = sortDatasets(datasets, { id: column, desc: false });
      for (let index = 1; index < sorted.length; index += 1) {
        expect(compareDatasets(sorted[index - 1]!, sorted[index]!, column)).toBeLessThanOrEqual(0);
      }
    }
    const reversed = sortDatasets(datasets, { id: "name", desc: true });
    expect(reversed[0]?.name.localeCompare(reversed.at(-1)!.name)).toBeGreaterThan(0);
  });
});
