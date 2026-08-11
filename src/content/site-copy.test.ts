import { describe, expect, it } from "vitest";
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
    expect(catalogCopy.showResults(5)).toBe("Show 5 datasets");
    expect(catalogCopy.removeFilter("Domain: Economics")).toBe(
      "Remove Domain: Economics filter",
    );
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
