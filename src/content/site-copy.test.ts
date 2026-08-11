import { describe, expect, it } from "vitest";
import { getAllDatasets } from "../lib/datasets";
import {
  accessTypeLabels,
  catalogCopy,
  copyButtonCopy,
  datasetCardCopy,
  datasetGuideCopy,
  difficultyDescriptions,
  filterChipPrefixes,
  filterCopy,
  notFoundCopy,
  siteCopy,
} from "./site-copy";

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(collectStrings);
}

describe("site copy", () => {
  it("keeps every static copy value non-empty", () => {
    const values = collectStrings([
      siteCopy,
      catalogCopy,
      filterChipPrefixes,
      filterCopy,
      datasetCardCopy,
      accessTypeLabels,
      difficultyDescriptions,
      datasetGuideCopy,
      copyButtonCopy,
      notFoundCopy,
    ]);

    expect(values.length).toBeGreaterThan(0);
    expect(values.every((value) => value.trim().length > 0)).toBe(true);
  });

  it("formats result counts and accessibility labels", () => {
    expect(catalogCopy.resultCount(0)).toBe("0 datasets");
    expect(catalogCopy.resultCount(1)).toBe("1 dataset");
    expect(catalogCopy.resultCount(5)).toBe("5 datasets");
    expect(catalogCopy.resultStatus(1)).toBe("1 dataset found");
    expect(catalogCopy.resultsLink(0)).toBe("0 matching datasets · View results");
    expect(catalogCopy.resultsLink(1)).toBe("1 matching dataset · View results");
    expect(catalogCopy.resultsLink(5)).toBe("5 matching datasets · View results");
    expect(catalogCopy.trustDatasetCount(1)).toBe("1 curated source");
    expect(catalogCopy.trustDatasetCount(10)).toBe("10 curated sources");
    expect(catalogCopy.showResults(5)).toBe("Show 5 datasets");
    expect(catalogCopy.removeFilter("Domain: Economics")).toBe(
      "Remove Domain: Economics filter",
    );
  });

  it("keeps product ideas unique and the featured dataset resolvable", () => {
    const labels = catalogCopy.productIdeas.map((idea) => idea.label);
    const queries = catalogCopy.productIdeas.map((idea) => idea.query);
    expect(new Set(labels).size).toBe(labels.length);
    expect(new Set(queries).size).toBe(queries.length);
    expect(
      getAllDatasets().some(
        (dataset) => dataset.id === catalogCopy.featuredStarter.datasetId,
      ),
    ).toBe(true);
  });

  it("covers every access type and difficulty", () => {
    expect(Object.keys(accessTypeLabels).sort()).toEqual([
      "api",
      "both",
      "download",
    ]);
    expect(Object.keys(difficultyDescriptions).sort()).toEqual([
      "advanced",
      "beginner",
      "intermediate",
    ]);
    expect(datasetGuideCopy.accessTypes(["download", "api"])).toBe(
      "Download or API",
    );
    expect(datasetGuideCopy.accessTypes(["both"])).toBe("Download and API");
  });

  it("formats API-key and dataset-detail states", () => {
    expect(datasetCardCopy.apiKeyStatus(true)).toBe("Free API key required");
    expect(datasetCardCopy.apiKeyStatus(false)).toBe("No API key required");
    expect(
      datasetGuideCopy.detailsSummary({
        provider: "World Bank",
        sourceType: "intergovernmental",
        lastVerified: "2026-08-10",
        temporalCoverage: "1960-present",
      }),
    ).toBe(
      "World Bank is an intergovernmental source. Last verified 2026-08-10. Temporal coverage: 1960-present.",
    );
    expect(
      datasetGuideCopy.detailsSummary({
        provider: "Natural Earth",
        sourceType: "community",
        lastVerified: "2026-08-10",
        temporalCoverage: null,
      }),
    ).toBe(
      "Natural Earth is a community source. Last verified 2026-08-10. Temporal coverage: not applicable.",
    );
  });
});
