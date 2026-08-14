import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS } from "./search";
import type { FilterOptions } from "./search";
import {
  catalogSearchFromLocation,
  filtersToParams,
  isCanonicalPage,
  parseFilters,
  parsePage,
  parseSort,
  searchStringToCatalogState,
} from "./filter-params";

describe("filter URL helpers", () => {
  const options: FilterOptions = {
    themes: ["Environment & Hazards", "Research & Reference"],
    accessMethods: ["api", "download"],
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
      theme: "Research & Reference" as const,
      accessMethod: "download" as const,
      difficulty: "beginner" as const,
      domains: ["Geography"],
      dataTypes: ["Geospatial"],
      tasks: ["GIS"],
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
      difficulty: null,
      formats: ["CSV"],
      geographies: ["Global"],
    });
  });

  it("round-trips a shared multiword query", () => {
    const params = filtersToParams({ ...EMPTY_FILTERS, query: "company filings" });
    expect(parseFilters(params, options).query).toBe("company filings");
  });

  it("normalizes whitespace-only and padded shared queries", () => {
    expect(parseFilters(new URLSearchParams("q=+++"), options).query).toBe("");
    expect(
      parseFilters(new URLSearchParams("q=+company+filings+"), options).query,
    ).toBe("company filings");
  });

  it("round-trips validated sorting and rejects unknown values", () => {
    const sort = { id: "updates" as const, desc: true };
    const params = filtersToParams(EMPTY_FILTERS, sort);
    expect(parseSort(params)).toEqual(sort);
    expect(parseSort(new URLSearchParams("sort=name"))).toEqual({ id: "name", desc: false });
    expect(parseSort(new URLSearchParams("sort=unknown&order=desc"))).toBeNull();
    expect(parseSort(new URLSearchParams("sort=name&order=sideways"))).toBeNull();
    expect(filtersToParams(EMPTY_FILTERS, { id: "name", desc: false }).get("order"))
      .toBe("asc");
  });

  it("round-trips canonical pages and rejects invalid values", () => {
    expect(parsePage(filtersToParams(EMPTY_FILTERS, null, 3))).toBe(3);
    expect(filtersToParams(EMPTY_FILTERS, null, 1).has("page")).toBe(false);
    for (const value of ["0", "-1", "1.5", "abc", "9007199254740992"]) {
      expect(parsePage(new URLSearchParams(`page=${value}`))).toBe(1);
    }
    expect(parsePage(new URLSearchParams("page=2&page=3"))).toBe(1);
  });

  it("parses a search string into catalog state", () => {
    const state = searchStringToCatalogState(
      "?q=maps&theme=Research%20%26%20Reference&page=2&sort=name&order=desc",
      options,
    );
    expect(state.filters.query).toBe("maps");
    expect(state.filters.theme).toBe("Research & Reference");
    expect(state.sort).toEqual({ id: "name", desc: true });
    expect(state.page).toBe(2);
    expect(
      searchStringToCatalogState("q=maps", options).filters.query,
    ).toBe("maps");
  });

  it("detects canonical page query strings", () => {
    expect(isCanonicalPage(new URLSearchParams(), 1)).toBe(true);
    expect(isCanonicalPage(new URLSearchParams("page=1"), 1)).toBe(false);
    expect(isCanonicalPage(new URLSearchParams("page=2"), 2)).toBe(true);
    expect(isCanonicalPage(new URLSearchParams("page=2&page=2"), 2)).toBe(false);
    expect(isCanonicalPage(new URLSearchParams("q=maps"), 1)).toBe(true);
  });

  it("reads catalog search only while the location is on the catalog page", () => {
    expect(catalogSearchFromLocation("/", "/", "?q=maps")).toBe("?q=maps");
    expect(catalogSearchFromLocation("/", "/", "")).toBe("");
    expect(catalogSearchFromLocation("/", "/datasets/nws-weather-api", "?q=maps")).toBeNull();
    expect(catalogSearchFromLocation("/", "/datasets/nws-weather-api/", "")).toBeNull();
  });
});
