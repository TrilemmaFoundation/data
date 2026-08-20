import { describe, expect, it } from "vitest";
import { getAllDatasets } from "../lib/datasets";
import { isChicagoTitleCase } from "../lib/chicago-title-case";
import {
  accessTypeLabels,
  catalogCopy,
  collectionsCopy,
  contributeCopy,
  copyButtonCopy,
  datasetCardCopy,
  datasetGuideCopy,
  difficultyDescriptions,
  filterChipPrefixes,
  filterCopy,
  notFoundCopy,
  siteCopy,
  tableCopy,
  themeLandingCopy,
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
      tableCopy,
      themeLandingCopy,
      collectionsCopy,
      contributeCopy,
    ]);

    expect(values.length).toBeGreaterThan(0);
    expect(values.every((value) => value.trim().length > 0)).toBe(true);
  });

  it("uses Chicago Title Case for labels, titles, and navigation", () => {
    const values = collectStrings([
      filterCopy,
      filterChipPrefixes,
      datasetCardCopy,
      accessTypeLabels,
    ]);
    for (const value of values) {
      expect(isChicagoTitleCase(value), value).toBe(true);
    }
    expect(isChicagoTitleCase(siteCopy.mobileNavigationLabel)).toBe(true);
    expect(isChicagoTitleCase(siteCopy.foundationAriaLabel)).toBe(true);
    expect(isChicagoTitleCase(catalogCopy.searchLabel)).toBe(true);
    expect(isChicagoTitleCase(catalogCopy.activeFiltersAriaLabel)).toBe(true);
    expect(isChicagoTitleCase(catalogCopy.paginationLabel)).toBe(true);
    expect(isChicagoTitleCase(datasetGuideCopy.pythonSyntaxLabel)).toBe(true);
    expect(isChicagoTitleCase(datasetGuideCopy.notebookLabel)).toBe(true);
    expect(isChicagoTitleCase(copyButtonCopy.errorLabel)).toBe(true);
    expect(isChicagoTitleCase(contributeCopy.copiedYamlLabel)).toBe(true);
  });

  it("formats result counts and accessibility labels", () => {
    expect(catalogCopy.resultCount(0)).toBe("0 Datasets");
    expect(catalogCopy.resultCount(1)).toBe("1 Dataset");
    expect(catalogCopy.resultCount(5)).toBe("5 Datasets");
    expect(catalogCopy.resultStatus(1)).toBe("1 Dataset Found");
    expect(catalogCopy.showResults(1)).toBe("Show 1 Dataset");
    expect(catalogCopy.showResults(5)).toBe("Show 5 Datasets");
    expect(catalogCopy.pageSummary(1, 8, 1, 8)).toBe("Page 1 of 8 · Showing 1–8");
    expect(catalogCopy.pageSummary(2, 2, 9, 9)).toBe("Page 2 of 2");
    expect(catalogCopy.pageStatus(1, 8, 1, 8, 57)).toBe(
      "Page 1 of 8, showing 1–8 of 57 datasets.",
    );
    expect(catalogCopy.pageStatus(2, 2, 9, 9, 9)).toBe(
      "Page 2 of 2, showing 9 of 9 datasets.",
    );
    expect(catalogCopy.removeFilter("Domain: Economics")).toBe(
      "Remove Domain: Economics Filter",
    );
    expect(catalogCopy.heroTrust(141, "Aug 11, 2026")).toContain("141");
    expect(catalogCopy.datasetCount(1)).toBe("1 Dataset");
    expect(collectionsCopy.updatedLabel("2026-08-19")).toContain("2026-08-19");
    expect(datasetGuideCopy.setupMinutes(10)).toBe("10 min");
    expect(datasetGuideCopy.runtimeVerifiedLabel("Aug 19, 2026")).toContain("Aug 19");
    expect(datasetGuideCopy.statusUntilLabel("2026-09-01")).toContain("2026-09-01");
  });

  it("keeps the recommended dataset resolvable", () => {
    expect(
      getAllDatasets().some(
        (dataset) => dataset.id === catalogCopy.recommendedDatasetId,
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

  it("keeps table theme labels short and complete", () => {
    const themes = [...new Set(getAllDatasets().map((dataset) => dataset.theme))];
    expect(Object.keys(tableCopy.themeShort).sort()).toEqual([...themes].sort());
    expect(Object.keys(themeLandingCopy).sort()).toEqual([...themes].sort());
    for (const theme of themes) {
      expect(tableCopy.themeShort[theme].length).toBeLessThan(theme.length);
    }
  });

  it("formats API-key and dataset-detail states", () => {
    expect(datasetCardCopy.apiKeyStatus(true)).toBe("Free API Key Required");
    expect(datasetCardCopy.apiKeyStatus(false)).toBe("No API Key Required");
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
