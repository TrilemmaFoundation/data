import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS } from "./search";
import type { FilterOptions } from "./search";
import {
  applyQuickPreset,
  filtersToParams,
  parseFilters,
} from "./filter-params";

describe("filter URL helpers", () => {
  const options: FilterOptions = {
    domains: ["Biology", "Geography"],
    dataTypes: ["Geospatial", "Tabular"],
    tasks: ["Classification", "GIS"],
    difficulties: ["beginner", "intermediate"],
    sizes: ["Tiny", "Small", "Medium", "Large"],
    formats: ["CSV", "GeoJSON"],
    geographies: ["Global", "Not applicable"],
  };

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
    expect(parseFilters(filtersToParams(filters), options)).toEqual(filters);
  });

  it("preserves whitespace while a multi-word query is being typed", () => {
    const filters = { ...EMPTY_FILTERS, query: "world " };
    expect(filtersToParams(filters).get("q")).toBe("world ");
  });

  it("drops invalid sizes and API-key values", () => {
    const filters = parseFilters(
      new URLSearchParams("size=Tiny,Unknown&apiKey=maybe"),
      options,
    );
    expect(filters.sizes).toEqual(["Tiny"]);
    expect(filters.apiKeyRequired).toBeNull();
  });

  it("drops unknown and duplicate catalog values", () => {
    const filters = parseFilters(
      new URLSearchParams(
        "domain=Unknown,Biology,Biology&dataType=Nope&task=GIS&difficulty=novice&format=CSV,XYZ&geography=Global,Elsewhere",
      ),
      options,
    );
    expect(filters).toMatchObject({
      domains: ["Biology"],
      dataTypes: [],
      tasks: ["GIS"],
      difficulties: [],
      formats: ["CSV"],
      geographies: ["Global"],
    });
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
