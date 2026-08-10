import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS } from "./search";
import {
  applyQuickPreset,
  filtersToParams,
  parseFilters,
} from "./filter-params";

describe("filter URL helpers", () => {
  it("round-trips every supported filter", () => {
    const filters = {
      query: "maps",
      domains: ["Geography"],
      dataTypes: ["Geospatial"],
      tasks: ["GIS"],
      difficulties: ["beginner"],
      sizes: ["Tiny" as const],
      formats: ["CSV"],
      apiKeyRequired: false,
      geographies: ["Global"],
    };
    expect(parseFilters(filtersToParams(filters))).toEqual(filters);
  });

  it("drops invalid sizes and API-key values", () => {
    const filters = parseFilters(new URLSearchParams("size=Tiny,Unknown&apiKey=maybe"));
    expect(filters.sizes).toEqual(["Tiny"]);
    expect(filters.apiKeyRequired).toBeNull();
  });

  it("builds deterministic presets while preserving search", () => {
    const source = { ...EMPTY_FILTERS, query: "flowers", domains: ["Biology"] };
    expect(applyQuickPreset(source, "beginner")).toMatchObject({
      query: "flowers",
      domains: [],
      difficulties: ["beginner"],
    });
    expect(applyQuickPreset(source, "small-csv")).toMatchObject({
      query: "flowers",
      sizes: ["Tiny", "Small"],
      formats: ["CSV"],
      apiKeyRequired: false,
    });
  });
});
