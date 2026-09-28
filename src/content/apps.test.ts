import { describe, expect, it } from "vitest";
import { apps, getAppBySlug } from "./apps";
import { getActiveDatasets } from "../lib/datasets";

const expectedApps = [
  { slug: "titanskies", title: "TitanSkies", status: undefined, liveUrl: "https://www.titanskies.com/", archiveUrl: undefined, sourceUrl: "https://github.com/hypertrial/titanskies" },
  { slug: "hyperoptions", title: "HyperOptions", status: undefined, liveUrl: undefined, archiveUrl: undefined, sourceUrl: "https://github.com/hypertrial/hyperoptions" },
  { slug: "travelcanary", title: "TravelCanary", status: "beta", liveUrl: "https://travelcanary.org/", archiveUrl: undefined, sourceUrl: "https://github.com/hypertrial/travelcanary" },
  { slug: "househunter", title: "HouseHunter", status: "alpha", liveUrl: undefined, archiveUrl: undefined, sourceUrl: "https://github.com/hypertrial/househunter" },
  { slug: "rockyroad", title: "RockyRoad", status: "alpha", liveUrl: undefined, archiveUrl: undefined, sourceUrl: "https://github.com/hypertrial/rockyroad" },
  { slug: "stackingsats", title: "StackingSats", status: "archived", liveUrl: undefined, archiveUrl: "https://stackingsats.org/", sourceUrl: "https://github.com/hypertrial/stacksats" },
] as const;

function expectHttps(raw: string) {
  const url = new URL(raw);
  expect(url.protocol, raw).toBe("https:");
  expect(url.hostname, raw).not.toBe("");
  expect(url.username, raw).toBe("");
  expect(url.password, raw).toBe("");
}

describe("reviewed app catalog", () => {
  it("has exactly the six intended routes, availability states, and outbound destinations", () => {
    expect(apps.map(({ slug, title, status, liveUrl, archiveUrl, sourceUrl }) => ({
      slug, title, status, liveUrl, archiveUrl, sourceUrl,
    }))).toEqual(expectedApps);
    expect(new Set(apps.map(({ slug }) => slug)).size).toBe(6);
    expect(getAppBySlug("")).toBeUndefined();
    expect(getAppBySlug("travelcanary-extra")).toBeUndefined();
    expect(getAppBySlug("TravelCanary")).toBeUndefined();
    for (const app of apps) expect(getAppBySlug(app.slug)).toBe(app);
  });

  it("pins evidence and gives every source a usable disposition", () => {
    const activeGuideIds = new Set(getActiveDatasets().map(({ id }) => id));
    for (const app of apps) {
      expect(app.summary.trim(), app.slug).not.toBe("");
      expect(app.sourceIntro.trim(), app.slug).not.toBe("");
      expect(app.sources.length, app.slug).toBeGreaterThan(0);
      expect(app.sourceRevision, app.slug).toMatch(/^[a-f0-9]{40}$/);
      expect(app.reviewedAt, app.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const reviewDate = new Date(`${app.reviewedAt}T00:00:00Z`);
      expect(reviewDate.toISOString().slice(0, 10), app.slug).toBe(app.reviewedAt);
      expect(reviewDate.getTime(), app.slug).toBeLessThanOrEqual(Date.now());
      const today = new Date();
      const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
      expect(todayUtc - reviewDate.getTime(), `${app.slug}: source map is older than 90 days`).toBeLessThanOrEqual(90 * 24 * 60 * 60 * 1000);
      for (const url of [app.sourceUrl, app.sourceEvidenceUrl, app.liveUrl, app.archiveUrl]) {
        if (url) expectHttps(url);
      }
      expect(app.sourceEvidenceUrl, app.slug).toContain(app.sourceRevision);

      const names = new Set<string>();
      for (const source of app.sources) {
        expect(source.name.trim(), app.slug).not.toBe("");
        expect(names.has(source.name), `${app.slug}: ${source.name}`).toBe(false);
        names.add(source.name);
        expect(source.role.trim(), `${app.slug}: ${source.name}`).not.toBe("");
        expect(source.availability.trim(), `${app.slug}: ${source.name}`).not.toBe("");
        expectHttps(source.officialUrl);
        if (source.evidenceUrl) expectHttps(source.evidenceUrl);
        for (const { href } of source.additionalUrls ?? []) expectHttps(href);
        expect(Boolean(source.guideId), `${app.slug}: ${source.name}`).not.toBe(Boolean(source.noGuideReason));
        if (source.guideId) expect(activeGuideIds.has(source.guideId), `${app.slug}: ${source.name}`).toBe(true);
        if (source.relatedGuideId) expect(activeGuideIds.has(source.relatedGuideId), `${app.slug}: ${source.name}`).toBe(true);
        if (source.noGuideReason) expect(source.noGuideReason.trim().length, `${app.slug}: ${source.name}`).toBeGreaterThan(10);
      }
    }
  });

  it("links confirmed feed families only to their matching guides", () => {
    for (const [slug, sourceName, guideId] of [
      ["titanskies", /AirNow/i, "airnow-air-quality"],
      ["travelcanary", /USGS earthquake/i, "usgs-earthquakes"],
      ["travelcanary", /GDACS/i, "gdacs-disaster-alerts"],
      ["househunter", /TIGER\/Line/i, "census-tiger-line"],
      ["hyperoptions", /SEC EDGAR/i, "sec-edgar-apis"],
    ] as const) {
      const source = getAppBySlug(slug)?.sources.find(({ name }) => sourceName.test(name));
      expect(source, `${slug}: ${sourceName}`).toBeDefined();
      expect(source?.guideId, `${slug}: ${sourceName}`).toBe(guideId);
    }
    for (const [slug, name] of [
      ["househunter", "FEMA National Risk Index"],
      ["rockyroad", "OpenStreetMap regional extracts via Geofabrik"],
    ] as const) {
      const source = getAppBySlug(slug)?.sources.find((entry) => entry.name === name);
      expect(source, `${slug}: ${name}`).toBeDefined();
      expect(source?.guideId, `${slug}: ${name}`).toBeUndefined();
      expect(source?.noGuideReason, `${slug}: ${name}`).toMatch(/different|does not cover/i);
    }
    expect(getAppBySlug("stackingsats")?.sourceIntro).toMatch(/historical|archiv/i);
    const brk = getAppBySlug("stackingsats")?.sources.find(({ name }) => name === "Bitcoin Research Kit merged metrics");
    expect(brk?.guideId).toBeUndefined();
    expect(brk?.relatedGuideId).toBe("bitview-bitcoin-series");
    expect(brk?.noGuideReason).toMatch(/not this pinned historical parquet/i);
    expect(getAppBySlug("travelcanary")?.sources.length).toBeGreaterThan(20);
  });
});
