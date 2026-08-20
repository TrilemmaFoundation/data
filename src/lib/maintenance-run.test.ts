import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { getDatasetById } from "./datasets";
import { getAllCollections } from "./collections";
import { buildMaintenanceReport } from "./maintenance";
import {
  collectUrlFindings,
  maintenanceExitCode,
  sanitizeMaintenanceReport,
  writeMaintenanceArtifacts,
} from "./maintenance-run";

describe("maintenance run", () => {
  const nws = getDatasetById("nws-weather-api")!;
  const collections = getAllCollections();

  it("skips network work in offline mode and still records exception warnings", async () => {
    const validateUrls = vi.fn();
    const result = await collectUrlFindings({
      offline: true,
      datasets: [nws],
      validateUrls,
      exceptionWarnings: () => ["example.com expires soon"],
    });
    expect(validateUrls).not.toHaveBeenCalled();
    expect(result.urlErrors.size).toBe(0);
    expect(result.exceptionWarnings).toEqual(["example.com expires soon"]);
    expect(maintenanceExitCode(result.urlErrors)).toBe(0);
  });

  it("retains live URL errors and fails the gate after artifacts are written", async () => {
    const urlErrors = new Map([["nws-weather-api.yaml", ["source page mismatch"]]]);
    const collected = await collectUrlFindings({
      offline: false,
      datasets: [nws],
      validateUrls: async () => ({ errors: urlErrors, warnings: new Map() }),
      exceptionWarnings: () => [],
    });
    expect(collected.urlErrors).toBe(urlErrors);
    expect(collected.exceptionWarnings).toEqual([]);
    expect(maintenanceExitCode(collected.urlErrors)).toBe(1);

    const report = buildMaintenanceReport({
      datasets: [nws],
      collections,
      urlErrors: collected.urlErrors,
      today: new Date("2026-08-19T00:00:00Z"),
    });
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "maintenance-report-"));
    const summary = path.join(outDir, "summary.md");
    const written = writeMaintenanceArtifacts(report, {
      outDir,
      githubStepSummary: summary,
    });
    expect(written.markdown).toContain("source page mismatch");
    expect(fs.readFileSync(path.join(outDir, "maintenance-report.md"), "utf8")).toContain(
      "Broken live URLs",
    );
    expect(fs.readFileSync(path.join(outDir, "maintenance-report.json"), "utf8")).toContain(
      "source page mismatch",
    );
    expect(fs.readFileSync(summary, "utf8")).toContain("source page mismatch");
    expect(written.json).not.toContain("latitude,longitude");
  });

  it("keeps live URL exception warnings with expiry warnings", async () => {
    const collected = await collectUrlFindings({
      offline: false,
      datasets: [nws],
      validateUrls: async () => ({
        errors: new Map(),
        warnings: new Map([
          ["nws-weather-api.yaml", ["https://example.com returned HTTP 403; allowed until 2026-09-01"]],
        ]),
      }),
      exceptionWarnings: () => ["example.com expires soon"],
    });
    expect(collected.urlErrors.size).toBe(0);
    expect(collected.exceptionWarnings).toEqual([
      "example.com expires soon",
      "https://example.com returned HTTP 403; allowed until 2026-09-01",
    ]);
    expect(maintenanceExitCode(collected.urlErrors)).toBe(0);
  });

  it("records unexpected live-check failures as sanitized findings", async () => {
    const fromError = await collectUrlFindings({
      offline: false,
      datasets: [nws],
      validateUrls: async () => {
        throw new Error("dns \u0007 failed");
      },
      exceptionWarnings: () => [],
    });
    expect(fromError.urlErrors.get("live-url-check")?.[0]).toContain("live URL validation failed:");
    expect(fromError.urlErrors.get("live-url-check")?.[0]).toContain("\\u0007");
    expect(maintenanceExitCode(fromError.urlErrors)).toBe(1);

    const fromValue = await collectUrlFindings({
      offline: false,
      datasets: [nws],
      validateUrls: async () => {
        throw "offline";
      },
      exceptionWarnings: () => [],
    });
    expect(fromValue.urlErrors.get("live-url-check")).toEqual([
      "live URL validation failed: offline",
    ]);
  });

  it("sanitizes control characters in written artifacts", () => {
    const report = sanitizeMaintenanceReport(
      buildMaintenanceReport({
        datasets: [nws],
        collections: [],
        urlErrors: new Map([["nws-weather-api.yaml", ["bad\nmarker \u001b[31m"]]]),
      }),
    );
    const writes: Record<string, string> = {};
    const { markdown, json } = writeMaintenanceArtifacts(report, {
      outDir: "/tmp/maintenance-artifacts",
      mkdir: () => undefined,
      writeFile: (file, contents) => {
        writes[file] = contents;
      },
    });
    expect(markdown).toContain("\\u000a");
    expect(markdown).toContain("\\u001b");
    expect(json).not.toContain("\u001b");
    expect(Object.keys(writes)).toHaveLength(2);
  });

  it("rejects live mode without a validator and uses default exception warnings offline", async () => {
    await expect(
      collectUrlFindings({ offline: false, datasets: [nws] }),
    ).rejects.toThrow("live maintenance requires a URL validator");

    const collected = await collectUrlFindings({
      offline: true,
      datasets: [nws],
    });
    expect(collected.urlErrors.size).toBe(0);
    expect(Array.isArray(collected.exceptionWarnings)).toBe(true);

    const writes: string[] = [];
    writeMaintenanceArtifacts(
      buildMaintenanceReport({ datasets: [nws], collections: [] }),
      {
        outDir: "/tmp/maintenance-default",
        mkdir: () => undefined,
        writeFile: (file) => writes.push(file),
      },
    );
    expect(writes).toEqual([
      "/tmp/maintenance-default/maintenance-report.md",
      "/tmp/maintenance-default/maintenance-report.json",
    ]);
  });
});
