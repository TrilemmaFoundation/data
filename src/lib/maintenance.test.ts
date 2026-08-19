import { describe, expect, it } from "vitest";
import { getAllCollections } from "./collections";
import { getDatasetById } from "./datasets";
import { buildMaintenanceReport, formatMaintenanceMarkdown } from "./maintenance";

describe("maintenance report", () => {
  const nws = getDatasetById("nws-weather-api")!;
  const collections = getAllCollections();

  it("buckets verification, lifecycle, editorial, and operational findings", () => {
    const overdue = {
      ...nws,
      id: "overdue-dataset",
      last_verified: "2026-01-01",
    };
    const dueSoon = {
      ...nws,
      id: "due-soon-dataset",
      last_verified: "2026-06-01",
    };
    const unavailable = {
      ...nws,
      id: "temp-dataset",
      catalog_status: "temporarily_unavailable" as const,
      status_reason: undefined,
      status_until: "2026-08-01",
    };
    const currentUnavailable = {
      ...unavailable,
      id: "temp-current",
      status_reason: "Provider outage",
      status_until: undefined,
    };
    const deprecated = {
      ...nws,
      id: "old-dataset",
      catalog_status: "deprecated" as const,
      status_reason: undefined,
      replacement_id: undefined,
    };
    const staleCollection = {
      ...collections[0]!,
      id: "stale-collection",
      last_updated: "2026-01-01",
    };

    const report = buildMaintenanceReport({
      datasets: [nws, overdue, dueSoon, unavailable, currentUnavailable, deprecated],
      collections: [staleCollection],
      vocabularyErrors: ["unknown term"],
      maintainerErrors: ["missing default"],
      urlErrors: new Map([["nws-weather-api.yaml", ["source page mismatch"]]]),
      exceptionWarnings: ["example.com expires soon"],
      notebookDrift: ["missing generated notebook demo.ipynb"],
      canaryFailures: ["nws-weather-api timed out"],
      changedProviderFiles: ["nws-weather-api.yaml"],
      today: new Date("2026-08-19T00:00:00Z"),
    });

    expect(report.lifecycle.active_count).toBe(3);
    expect(report.verification.overdue.map((item) => item.id)).toContain("overdue-dataset");
    expect(report.verification.due_soon.map((item) => item.id)).toContain("due-soon-dataset");
    expect(report.lifecycle.expired_temporary.map((item) => item.id)).toContain("temp-dataset");
    expect(report.lifecycle.temporarily_unavailable[0]?.message).toBe("temporarily unavailable");
    expect(report.lifecycle.deprecated[0]?.message).toContain("unknown");
    expect(report.lifecycle.deprecated[0]?.id).toBe("old-dataset");
    expect(report.editorial.collections[0]?.id).toBe("stale-collection");
    expect(report.sources.broken_urls[0]?.message).toContain("source page mismatch");
    expect(formatMaintenanceMarkdown(report)).toContain("Verification overdue");
    expect(formatMaintenanceMarkdown(report)).toContain("unknown term");
  });

  it("renders empty sections when the catalog is clean", () => {
    const report = buildMaintenanceReport({
      datasets: [nws],
      collections,
      today: new Date("2026-08-19T00:00:00Z"),
    });
    expect(report.verification.overdue).toEqual([]);
    expect(formatMaintenanceMarkdown(report)).toContain("None.");
  });

  it("uses default empty collections for omitted operational inputs", () => {
    const deprecated = {
      ...nws,
      id: "old-dataset",
      catalog_status: "deprecated" as const,
      replacement_id: "nws-weather-api",
    };
    const report = buildMaintenanceReport({
      datasets: [deprecated],
      collections: [],
    });
    expect(report.lifecycle.deprecated[0]?.message).toContain("nws-weather-api");
    expect(report.generated_at).toMatch(/^\d{4}-/);
  });
});
