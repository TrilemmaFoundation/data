import { describe, expect, it } from "vitest";
import {
  canCompare,
  compareHref,
  MAX_COMPARE,
  MAX_SHORTLIST,
  parseCompareIds,
  parseShortlist,
  serializeShortlist,
  SHORTLIST_VERSION,
  toggleShortlistId,
} from "./shortlist";

describe("shortlist helpers", () => {
  const known = new Set(["nws-weather-api", "usgs-earthquakes", "ofac-sdn-list"]);

  it("recovers from missing, corrupt, and stale payloads", () => {
    expect(parseShortlist(null, known)).toEqual([]);
    expect(parseShortlist("not-json", known)).toEqual([]);
    expect(parseShortlist(JSON.stringify({ version: 0, ids: ["nws-weather-api"] }), known)).toEqual([]);
    expect(parseShortlist(JSON.stringify({ version: SHORTLIST_VERSION, ids: "nws" }), known)).toEqual([]);
  });

  it("keeps known unique ids and caps the list", () => {
    const ids = [
      "nws-weather-api",
      "nws-weather-api",
      "missing",
      "usgs-earthquakes",
      12,
    ];
    expect(
      parseShortlist(JSON.stringify({ version: SHORTLIST_VERSION, ids }), known),
    ).toEqual(["nws-weather-api", "usgs-earthquakes"]);
    expect(serializeShortlist(["nws-weather-api"])).toContain("nws-weather-api");
    const knownMany = new Set(
      Array.from({ length: MAX_SHORTLIST + 2 }, (_, index) => `id-${index}`),
    );
    expect(
      parseShortlist(
        JSON.stringify({ version: SHORTLIST_VERSION, ids: [...knownMany] }),
        knownMany,
      ),
    ).toHaveLength(MAX_SHORTLIST);
  });

  it("toggles membership without exceeding the cap", () => {
    expect(toggleShortlistId([], "missing", known)).toEqual([]);
    expect(toggleShortlistId([], "nws-weather-api", known)).toEqual(["nws-weather-api"]);
    expect(toggleShortlistId(["nws-weather-api"], "nws-weather-api", known)).toEqual([]);
    const filled = Array.from({ length: MAX_SHORTLIST }, (_, index) => `id-${index}`);
    const knownFilled = new Set([...filled, "nws-weather-api"]);
    expect(toggleShortlistId(filled, "nws-weather-api", knownFilled)).toEqual(filled);
  });

  it("parses compare URLs and builds share links", () => {
    expect(parseCompareIds(null, known)).toEqual([]);
    expect(parseCompareIds("nws-weather-api,missing,usgs-earthquakes,nws-weather-api,ofac-sdn-list,extra", known))
      .toEqual(["nws-weather-api", "usgs-earthquakes", "ofac-sdn-list"]);
    expect(parseCompareIds("nws-weather-api,usgs-earthquakes", known)).toHaveLength(2);
    expect(compareHref([])).toBe("/compare");
    expect(compareHref(["nws-weather-api", "usgs-earthquakes"])).toBe(
      "/compare?ids=nws-weather-api,usgs-earthquakes",
    );
    expect(canCompare(["a"])).toBe(false);
    expect(canCompare(["a", "b"])).toBe(true);
    expect(canCompare(Array.from({ length: MAX_COMPARE + 1 }, (_, index) => String(index)))).toBe(false);
  });
});
