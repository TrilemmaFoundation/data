import { describe, expect, it } from "vitest";
import { apps, getAppBySlug } from "./apps";
import nationalWarningSystems from "./apps/national-warning-systems.json";
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
        expect([source.guideId, source.guideIds, source.noGuideReason, source.systems].filter(Boolean), `${app.slug}: ${source.name}`).toHaveLength(1);
        if (source.guideId) expect(activeGuideIds.has(source.guideId), `${app.slug}: ${source.name}`).toBe(true);
        for (const guide of source.guideIds ?? []) {
          expect(activeGuideIds.has(guide.id), `${app.slug}: ${source.name}: ${guide.label}`).toBe(true);
        }
        if (source.relatedGuideId) expect(activeGuideIds.has(source.relatedGuideId), `${app.slug}: ${source.name}`).toBe(true);
        if (source.noGuideReason) {
          expect(source.noGuideReason.trim().length, `${app.slug}: ${source.name}`).toBeGreaterThan(25);
          expect(source.noGuideReason, `${app.slug}: ${source.name}`).not.toMatch(/no guide yet|not in the catalog|to be added|\bTBD\b/i);
        }
        if (source.systems) {
          expect(source.systems.length, source.name).toBeGreaterThan(0);
          for (const system of source.systems) {
            expectHttps(system.officialUrl);
            if (system.accessUrl) expectHttps(system.accessUrl);
            if (system.termsUrl) expectHttps(system.termsUrl);
            expect([system.guideId, system.guideIds, system.noGuideReason].filter(Boolean), `${source.name}: ${system.name}`).toHaveLength(1);
            if (system.guideId) expect(activeGuideIds.has(system.guideId), `${source.name}: ${system.name}`).toBe(true);
            for (const guide of system.guideIds ?? []) {
              expect(activeGuideIds.has(guide.id), `${source.name}: ${system.name}: ${guide.label}`).toBe(true);
            }
            if (system.noGuideReason) {
              expect(system.noGuideReason.trim().length, `${source.name}: ${system.name}`).toBeGreaterThan(25);
              expect(system.noGuideReason, `${source.name}: ${system.name}`).not.toMatch(/no guide yet|not in the catalog|to be added|\bTBD\b/i);
            }
          }
        }
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
      ["househunter", /FEMA National Risk Index/i, "fema-national-risk-index"],
      ["rockyroad", /Geofabrik/i, "geofabrik-osm-extracts"],
      ["hyperoptions", /Treasury interest rates/i, "treasury-yield-curve"],
      ["titanskies", /Natural Earth oceans/i, "natural-earth"],
      ["househunter", /FCC Broadband Data Collection/i, "fcc-bdc-county-fixed-summary"],
      ["househunter", /EPA Safe Drinking Water/i, "epa-sdwis-bulk-submission"],
      ["househunter", /EPA Community Water System/i, "epa-cws-service-areas-v2-1"],
      ["travelcanary", /SMHI water-shortage/i, "smhi-water-shortage-messages"],
      ["travelcanary", /IGN regional earthquakes/i, "ign-spain-earthquake-rss"],
    ] as const) {
      const source = getAppBySlug(slug)?.sources.find(({ name }) => sourceName.test(name));
      expect(source, `${slug}: ${sourceName}`).toBeDefined();
      expect(source?.guideId, `${slug}: ${sourceName}`).toBe(guideId);
    }
    expect(getAppBySlug("stackingsats")?.sourceIntro).toMatch(/historical|archiv/i);
    const brk = getAppBySlug("stackingsats")?.sources.find(({ name }) => name === "Bitcoin Research Kit merged metrics");
    expect(brk?.guideId).toBeUndefined();
    expect(brk?.relatedGuideId).toBe("bitview-bitcoin-series");
    expect(brk?.noGuideReason).toMatch(/not this pinned historical parquet/i);
    const effis = getAppBySlug("travelcanary")?.sources.find(({ name }) => name === "Copernicus EFFIS");
    expect(effis?.guideIds?.map(({ id }) => id)).toEqual([
      "effis-fire-danger-forecast", "effis-active-fire-hotspots", "effis-burned-area-perimeters",
    ]);
    const flood = getAppBySlug("travelcanary")?.sources.find(({ name }) => name === "Copernicus Global Flood Monitoring");
    expect(flood?.guideIds?.map(({ id }) => id)).toEqual([
      "copernicus-gfm-flood-layers", "copernicus-glofas-flood-outlook",
    ]);
    expect(getAppBySlug("travelcanary")?.sources.length).toBeGreaterThan(20);
  });

  it("keeps the 45 country partitions and all 83 named national warning systems", () => {
    const travelCanary = getAppBySlug("travelcanary")!;
    expect(nationalWarningSystems.sourceRevision).toBe(travelCanary.sourceRevision);
    expect(nationalWarningSystems.reviewedAt).toBe(travelCanary.reviewedAt);
    const countries = travelCanary.sources.filter(({ group }) => group === "National warnings");
    expect(countries).toHaveLength(45);
    expect(countries.flatMap(({ systems }) => systems ?? [])).toHaveLength(83);
    expect(countries.flatMap(({ systems }) => systems?.map(({ id }) => id) ?? []).sort()).toEqual(
      Object.values(nationalWarningSystems.countries).flat().map(({ id }) => id).sort(),
    );
    for (const country of countries) {
      expect(country.availability).toMatch(/partition/);
      expect(country.details).toBeTruthy();
      expect(country.systems?.length).toBeGreaterThan(0);
    }
  });
});
