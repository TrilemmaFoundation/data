import { describe, expect, it } from "vitest";
import * as nav from "./nav";
import {
  isCollectionsPath,
  isContributePath,
  isDatasetsPath,
} from "./nav";

describe("primary navigation current paths", () => {
  it("treats catalog, guides, and theme landings as Datasets", () => {
    expect(isDatasetsPath("/")).toBe(true);
    expect(isDatasetsPath("/datasets/nws-weather-api")).toBe(true);
    expect(isDatasetsPath("/datasets/nws-weather-api/")).toBe(true);
    expect(isDatasetsPath("/themes/environment-hazards")).toBe(true);
    expect(isDatasetsPath("/themes/environment-hazards/")).toBe(true);
    expect(isDatasetsPath("/collections")).toBe(false);
    expect(isDatasetsPath("/compare")).toBe(false);
    expect(isDatasetsPath("/contribute")).toBe(false);
  });

  it("scopes the other primary destinations to their routes", () => {
    expect(isCollectionsPath("/collections")).toBe(true);
    expect(isCollectionsPath("/collections/")).toBe(true);
    expect(isCollectionsPath("/collections/first-builds")).toBe(true);
    expect(isContributePath("/contribute")).toBe(true);
    expect(isContributePath("/contribute/")).toBe(true);
    expect(isCollectionsPath("/")).toBe(false);
    expect(isContributePath("/collections")).toBe(false);
  });

  it("does not treat /compare as a primary destination", () => {
    expect(nav).not.toHaveProperty("isComparePath");
    expect(isDatasetsPath("/compare/")).toBe(false);
    expect(isCollectionsPath("/compare")).toBe(false);
    expect(isCollectionsPath("/compare/")).toBe(false);
    expect(isContributePath("/compare")).toBe(false);
    expect(isContributePath("/compare/")).toBe(false);
  });
});
