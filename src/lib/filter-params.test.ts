import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS } from "./search";
import type { FilterOptions } from "./search";
import {
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

  it("round-trips comma-containing values and repeated selections", () => {
    const commaOptions = {
      ...options,
      domains: ["Climate, Energy", "Geography"],
    };
    const filters = {
      ...EMPTY_FILTERS,
      domains: ["Climate, Energy", "Geography"],
    };
    const params = filtersToParams(filters);

    expect(params.getAll("domain")).toEqual(filters.domains);
    expect(parseFilters(params, commaOptions).domains).toEqual(filters.domains);
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

  it("parses a required API key", () => {
    expect(
      parseFilters(new URLSearchParams("apiKey=true"), options).apiKeyRequired,
    ).toBe(true);
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

  it("round-trips a shared multiword query", () => {
    const params = filtersToParams({ ...EMPTY_FILTERS, query: "company filings" });
    expect(parseFilters(params, options).query).toBe("company filings");
  });
});
