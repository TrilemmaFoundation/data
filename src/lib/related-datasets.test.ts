import { describe, expect, it } from "vitest";
import { getCatalogDatasets, getDatasetById } from "./datasets";
import { getRelatedDatasets, relatedScore } from "./related-datasets";
import type { CatalogDataset } from "./schema";

describe("related datasets", () => {
  const catalog = getCatalogDatasets();
  const nws = getDatasetById("nws-weather-api")!;

  it("returns a stable top-three of overlapping active datasets", () => {
    const related = getRelatedDatasets(nws, catalog);
    const listed = catalog.find((item) => item.id === nws.id)!;
    const sourceTags = {
      domains: listed.canonical_domains,
      tasks: listed.canonical_tasks,
    };
    expect(related).toHaveLength(3);
    expect(related.map((item) => item.id)).not.toContain("nws-weather-api");
    const scores = related.map((item) => relatedScore(nws, item, sourceTags));
    expect(scores[0]!).toBeGreaterThanOrEqual(scores[1]!);
    expect(scores[1]!).toBeGreaterThanOrEqual(scores[2]!);
  });

  it("excludes self and inactive rows and drops zero-score matches", () => {
    const self = catalog.find((item) => item.id === "nws-weather-api")!;
    expect(relatedScore(nws, self)).toBe(Number.NEGATIVE_INFINITY);

    const inactive = { ...self, id: "inactive", catalog_status: "deprecated" as const };
    expect(relatedScore(nws, inactive)).toBe(Number.NEGATIVE_INFINITY);

    const stranger = {
      ...self,
      id: "stranger",
      name: "Unrelated",
      theme: "Research & Reference" as const,
      canonical_domains: [],
      domains: ["Research"],
      canonical_tasks: [],
      tasks: ["Topic Research"],
      data_types: ["Text"],
      difficulty: "advanced" as const,
      access_type: ["download"] as CatalogDataset["access_type"],
    };
    expect(relatedScore(nws, stranger)).toBe(0);
    const both = {
      ...catalog[0]!,
      id: "both-access",
      name: "Both Access",
      theme: nws.theme,
      access_type: ["both"] as CatalogDataset["access_type"],
      canonical_domains: nws.domains,
      canonical_tasks: nws.tasks,
      data_types: nws.data_types,
      difficulty: nws.difficulty,
    };
    expect(relatedScore(nws, both)).toBeGreaterThan(0);
  });

  it("breaks score ties by dataset name", () => {
    const left = {
      ...catalog[0]!,
      id: "alpha-related",
      name: "Alpha",
      theme: nws.theme,
      canonical_domains: [],
      canonical_tasks: [],
      data_types: [],
      difficulty: nws.difficulty,
      catalog_status: "active" as const,
    };
    const right = { ...left, id: "zeta-related", name: "Zeta" };
    expect(
      getRelatedDatasets(nws, [right, left]).map((item) => item.id),
    ).toEqual(["alpha-related", "zeta-related"]);
  });

  it("counts alias domain tags as their canonical labels", () => {
    const acs = getDatasetById("acs-five-year-estimates")!;
    const acsCatalog = catalog.find((item) => item.id === acs.id)!;
    expect(acs.domains).toContain("Local Economics");
    expect(acsCatalog.canonical_domains).toContain("Regional Economics");
    const candidate = {
      ...catalog[0]!,
      id: "regional-economics-only",
      theme: "Research & Reference" as const,
      canonical_domains: ["Regional Economics"],
      canonical_tasks: [],
      data_types: [],
      difficulty: "advanced" as const,
      access_type: [] as CatalogDataset["access_type"],
    };
    expect(
      relatedScore(acs, candidate, {
        domains: acsCatalog.canonical_domains,
        tasks: acsCatalog.canonical_tasks,
      }),
    ).toBe(1);
    expect(
      relatedScore(acs, candidate, { domains: ["Demographics", "Housing"], tasks: acs.tasks }),
    ).toBe(0);
    expect(
      getRelatedDatasets(acs, [acsCatalog, candidate], 1).map((item) => item.id),
    ).toEqual(["regional-economics-only"]);
  });
});
