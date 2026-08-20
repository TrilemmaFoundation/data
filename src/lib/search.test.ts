import { describe, expect, it } from "vitest";
import type { CatalogDataset } from "./schema";
import { getCatalogDatasets } from "./datasets";
import { getVocabulary, toVocabularySnapshot } from "./vocabulary";
import {
  CATALOG_PAGE_SIZE,
  compareDatasets,
  deriveCatalogPage,
  EMPTY_FILTERS,
  filterDatasets,
  getDatasetAccessMethods,
  getFilterOptions,
  paginate,
  sortDatasets,
} from "./search";

const datasets = getCatalogDatasets();
const snapshot = toVocabularySnapshot(getVocabulary());
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

  it.each([
    ["DOI", "crossref-works"],
    ["biomedical", "pubmed-citations"],
    ["clinical trial", "clinicaltrials-studies"],
    ["hospital rating", "cms-care-compare-hospitals"],
    ["CVE", "nvd-cve"],
    ["ATT&CK", "mitre-attack-enterprise"],
    ["transit ridership", "fta-ntd-monthly-ridership"],
    ["legislation", "congress-gov-legislation"],
    ["biodiversity", "gbif-species-occurrences"],
    ["refugee", "unhcr-refugee-population"],
  ])("searches %s metadata", (query, id) => {
    expect(filterDatasets(datasets, { ...EMPTY_FILTERS, query }).map((dataset) => dataset.id))
      .toContain(id);
  });

  it("builds sorted, de-duplicated filter options", () => {
    const options = getFilterOptions(datasets, snapshot);
    expect(options.domains).toContain("Natural Hazards");
    expect(options.domains).not.toContain("Seismology");
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
      const folded = values.map((value) => String(value).toLocaleLowerCase("en-US"));
      expect(folded).toEqual([...new Set(folded)]);
    }
    expect(getFilterOptions([]).accessMethods).toEqual([]);
    expect(
      filterDatasets(
        datasets,
        { ...EMPTY_FILTERS, domains: ["Natural Hazards"] },
        snapshot,
      )
        .map((dataset) => dataset.id),
    ).toContain("usgs-earthquakes");
  });

  it("matches domain and task aliases to canonical filters", () => {
    expect(
      filterDatasets(datasets, { ...EMPTY_FILTERS, domains: ["Seismology"] }, snapshot).map(
        (dataset) => dataset.id,
      ),
    ).toContain("usgs-earthquakes");
    expect(
      filterDatasets(datasets, { ...EMPTY_FILTERS, tasks: ["Hazard Monitoring"] }, snapshot).map(
        (dataset) => dataset.id,
      ),
    ).toContain("usgs-earthquakes");
  });

  it("combines all filters and supports blank search text", () => {
    expect(
      filterDatasets(datasets, {
        ...EMPTY_FILTERS,
        query: "   ",
        theme: earthquakeCatalog.theme,
        accessMethod: "api",
        domains: [earthquakeCatalog.canonical_domains[0]!],
        dataTypes: [earthquakeCatalog.data_types[0]!],
        tasks: [earthquakeCatalog.canonical_tasks[0]!],
        difficulty: earthquakeCatalog.difficulty,
        sizes: ["Small"],
        formats: [earthquakeCatalog.formats[0]!],
        apiKeyRequired: false,
        geographies: [earthquakeCatalog.geography[0]!],
      }, snapshot).map((dataset) => dataset.id),
    ).toContain("usgs-earthquakes");
  });

  it("collapses case-variant tags into one filter option and still matches them", () => {
    const lower: CatalogDataset = { ...earthquakeCatalog, id: "lower", formats: ["netCDF"] };
    const upper: CatalogDataset = { ...earthquakeCatalog, id: "upper", formats: ["NetCDF"] };
    const options = getFilterOptions([lower, upper]);
    const netcdf = options.formats.filter(
      (value) => value.toLocaleLowerCase("en-US") === "netcdf",
    );
    expect(netcdf).toHaveLength(1);
    expect(
      filterDatasets([lower, upper], { ...EMPTY_FILTERS, formats: netcdf })
        .map((dataset) => dataset.id)
        .sort(),
    ).toEqual(["lower", "upper"]);
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

  it("paginates and clamps catalog results", () => {
    expect(paginate([], 99)).toEqual({
      items: [], page: 1, totalPages: 1, start: 0, end: 0,
    });
    expect(paginate(datasets, 1)).toMatchObject({
      page: 1,
      start: 1,
      end: CATALOG_PAGE_SIZE,
    });
    const last = paginate(datasets, 99);
    expect(last.page).toBe(Math.ceil(datasets.length / CATALOG_PAGE_SIZE));
    expect(last.end).toBe(datasets.length);
  });

  it("derives filtered, sorted, and paginated catalog results in one pass", () => {
    const filters = { ...EMPTY_FILTERS, query: "earthquake" };
    const sort = { id: "name" as const, desc: false };
    const derived = deriveCatalogPage(datasets, filters, sort, 1, snapshot);
    const results = filterDatasets(datasets, filters, snapshot);
    expect(derived.results).toEqual(results);
    expect(derived.paginated).toEqual(paginate(sortDatasets(results, sort), 1));
  });
});
