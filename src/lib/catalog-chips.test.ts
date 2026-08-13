import { describe, expect, it } from "vitest";
import { catalogCopy, filterChipPrefixes, filterCopy } from "@/content/site-copy";
import { activeChips, reconcileFilterChange } from "./catalog-chips";
import { EMPTY_FILTERS } from "./search";

const filters = {
  ...EMPTY_FILTERS,
  query: "earthquake",
  theme: "Environment & Hazards" as const,
  accessMethod: "api" as const,
  difficulty: "beginner" as const,
  domains: ["Natural Hazards"],
  dataTypes: ["Event Data"],
  tasks: ["Monitoring"],
  sizes: ["Tiny" as const],
  formats: ["GeoJSON"],
  apiKeyRequired: true,
  geographies: ["Global"],
};

describe("activeChips", () => {
  it("builds chips for search, selects, lists, and API-key state", () => {
    const chips = activeChips(filters);
    expect(chips.map((chip) => chip.label)).toEqual([
      `${filterChipPrefixes.query}: earthquake`,
      `${filterChipPrefixes.theme}: Environment & Hazards`,
      `${filterChipPrefixes.accessMethod}: API`,
      `${filterChipPrefixes.difficulty}: beginner`,
      `${filterChipPrefixes.domains}: Natural Hazards`,
      `${filterChipPrefixes.dataTypes}: Event Data`,
      `${filterChipPrefixes.tasks}: Monitoring`,
      `${filterChipPrefixes.sizes}: Tiny`,
      `${filterChipPrefixes.formats}: GeoJSON`,
      `${filterChipPrefixes.geographies}: Global`,
      filterCopy.apiKeyLabel,
    ]);
    expect(chips.find((chip) => chip.key === "query")?.next.query).toBe("");
    expect(chips.find((chip) => chip.key === "domains-Natural Hazards")?.next.domains)
      .toEqual([]);
  });

  it("labels download access and a missing API key", () => {
    const chips = activeChips({
      ...EMPTY_FILTERS,
      accessMethod: "download",
      apiKeyRequired: false,
    });
    expect(chips.map((chip) => chip.label)).toEqual([
      `${filterChipPrefixes.accessMethod}: Download`,
      catalogCopy.noApiKeyChipLabel,
    ]);
  });
});

describe("reconcileFilterChange", () => {
  it("returns the shared empty-filter identity", () => {
    expect(reconcileFilterChange(filters, EMPTY_FILTERS, filters)).toBe(EMPTY_FILTERS);
  });

  it("keeps the latest value unless the rendered snapshot changed", () => {
    const latest = { ...filters, query: "earthquake ", theme: null };
    expect(
      reconcileFilterChange(
        filters,
        { ...filters, query: "wildfire", domains: ["Climate"] },
        latest,
      ),
    ).toEqual({
      ...latest,
      query: "wildfire",
      domains: ["Climate"],
    });
    expect(
      reconcileFilterChange(
        filters,
        {
          ...filters,
          theme: "Health, Food & Safety",
          accessMethod: "download",
          difficulty: "advanced",
          dataTypes: ["Imagery"],
          tasks: ["Forecasting"],
          sizes: ["Small"],
          formats: ["CSV"],
          apiKeyRequired: false,
          geographies: ["United States"],
        },
        latest,
      ),
    ).toEqual({
      ...latest,
      theme: "Health, Food & Safety",
      accessMethod: "download",
      difficulty: "advanced",
      dataTypes: ["Imagery"],
      tasks: ["Forecasting"],
      sizes: ["Small"],
      formats: ["CSV"],
      apiKeyRequired: false,
      geographies: ["United States"],
    });
  });
});
