import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearDatasetCacheForTests,
  getAllDatasets,
  getDatasetById,
  getDatasetsDir,
  listDatasetFiles,
  loadDatasets,
  MAX_DATASET_FILE_BYTES,
} from "./datasets";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "datasets-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  clearDatasetCacheForTests();
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const validYaml = `
id: sample
name: Sample
description: A sample dataset.
theme: Research & Reference
url: https://example.com/sample
access_type:
  - download
api_key_required: false
free_to_access: true
size_gb_min: 0
size_gb_max: 0.1
formats:
  - CSV
license: CC BY 4.0
license_url: https://creativecommons.org/licenses/by/4.0/
url_checks:
  source_marker: Sample Dataset
  license_marker: Creative Commons Attribution 4.0
domains:
  - Biology
data_types:
  - Tabular
tasks:
  - Classification
difficulty: beginner
geography:
  - Not applicable
temporal_coverage: null
update_frequency: continuous
provider: Example
source_type: academic
last_verified: 2026-08-10
getting_started:
  overview: A friendly place to begin.
  prerequisites:
    - Python 3.10 or newer
  access_steps:
    - Download the CSV.
  python:
    packages:
      - pandas
    code: |
      print("hello")
  first_project:
    title: Explore the data
    goal: Understand its columns.
    steps:
      - Inspect the first rows.
      - Summarize the columns.
      - Record one finding.
`;

describe("loadDatasets", () => {
  it("includes every dataset added in the curated catalog expansions", () => {
    const ids = new Set(getAllDatasets().map((dataset) => dataset.id));
    for (const id of [
      "cisa-known-exploited-vulnerabilities",
      "nhtsa-vehicle-recalls",
      "openfema-disaster-declarations",
      "federal-register-documents",
      "sam-gov-contract-opportunities",
      "usaspending-federal-awards",
      "openfda-drug-adverse-events",
      "airnow-air-quality",
      "usgs-water-data",
      "noaa-tides-currents",
      "noaa-ncei-daily-summaries",
      "cdc-places",
      "bls-public-data-api",
      "usda-fooddata-central",
      "treasury-securities-auctions",
      "openalex-scholarly-works",
      "crossref-works",
      "pubmed-citations",
      "clinicaltrials-studies",
      "cms-care-compare-hospitals",
      "nvd-cve",
      "mitre-attack-enterprise",
      "census-tiger-line",
      "fta-ntd-monthly-ridership",
      "bea-regional-gdp-income",
      "fred-economic-series",
      "imf-world-economic-outlook",
      "unhcr-refugee-population",
      "nasa-power-daily",
      "congress-gov-legislation",
      "gbif-species-occurrences",
      "epa-airdata-daily-summaries",
      "cfpb-consumer-complaints",
      "college-scorecard",
      "fhfa-house-price-index",
      "openfda-food-enforcement",
      "osv-open-source-vulnerabilities",
      "fec-campaign-finance",
      "eurostat-statistics",
      "mobility-database-feeds",
      "bts-airline-on-time",
      "nppes-npi-registry",
      "epa-echo-drinking-water",
      "arxiv-preprints",
      "wikimedia-pageviews",
      "usda-nass-quick-stats",
      "noaa-ibtracs",
    ]) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it("assigns every dataset to the curated catalog theme", () => {
    const themes = Object.fromEntries(
      getAllDatasets().map((dataset) => [dataset.id, dataset.theme]),
    );
    const groups = {
      "Environment & Hazards": ["airnow-air-quality", "epa-airdata-daily-summaries", "epa-echo-drinking-water", "nasa-firms", "nasa-power-daily", "noaa-ibtracs", "nws-weather-api", "noaa-ncei-daily-summaries", "noaa-tides-currents", "openfema-disaster-declarations", "usgs-earthquakes", "usgs-water-data"],
      "Government & Policy": ["congress-gov-legislation", "fec-campaign-finance", "federal-register-documents", "sam-gov-contract-opportunities", "usaspending-federal-awards"],
      "Markets & Economics": ["bea-regional-gdp-income", "bls-public-data-api", "cfpb-consumer-complaints", "fhfa-house-price-index", "fred-economic-series", "imf-world-economic-outlook", "kalshi-market-data", "polymarket-markets", "sec-edgar-apis", "treasury-securities-auctions"],
      "Health, Food & Safety": ["cdc-places", "clinicaltrials-studies", "cms-care-compare-hospitals", "nhtsa-vehicle-recalls", "nppes-npi-registry", "openfda-drug-adverse-events", "openfda-food-enforcement", "usda-fooddata-central"],
      "Geospatial & Infrastructure": ["bts-airline-on-time", "census-tiger-line", "eia-hourly-electric-grid", "fta-ntd-monthly-ridership", "mobility-database-feeds", "natural-earth"],
      "Research & Reference": ["arxiv-preprints", "crossref-works", "gbif-species-occurrences", "openalex-scholarly-works", "pubmed-citations", "wikimedia-pageviews"],
      "Technology & Cybersecurity": ["cisa-known-exploited-vulnerabilities", "mitre-attack-enterprise", "nvd-cve", "osv-open-source-vulnerabilities"],
      "Demographics & Development": ["acs-five-year-estimates", "college-scorecard", "eurostat-statistics", "unhcr-refugee-population", "usda-nass-quick-stats", "world-development-indicators"],
    } as const;
    for (const [theme, ids] of Object.entries(groups)) {
      for (const id of ids) expect(themes[id], id).toBe(theme);
    }
    expect(Object.keys(themes)).toHaveLength(57);
  });

  it("loads valid yaml files and ignores templates", () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, "sample.yaml"), validYaml);
    fs.writeFileSync(path.join(dir, "_template.yaml"), validYaml);

    const result = loadDatasets(dir);
    expect(result.errors).toHaveLength(0);
    expect(result.datasets).toHaveLength(1);
    expect(result.datasets[0]?.id).toBe("sample");
  });

  it("reports id/filename mismatches", () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, "other.yaml"), validYaml);

    const result = loadDatasets(dir);
    expect(result.datasets).toHaveLength(0);
    expect(result.errors[0]?.messages.some((m) => m.includes("must match"))).toBe(
      true,
    );
  });

  it("reports schema errors", () => {
    const dir = makeTempDir();
    fs.writeFileSync(
      path.join(dir, "sample.yaml"),
      validYaml.replace("free_to_access: true", "free_to_access: false"),
    );

    const result = loadDatasets(dir);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("reports malformed YAML and root-level schema errors", () => {
    const malformed = makeTempDir();
    fs.writeFileSync(path.join(malformed, "sample.yaml"), "[");
    expect(loadDatasets(malformed).errors[0]?.messages[0]).toContain(
      "YAML parse error",
    );

    const invalidRoot = makeTempDir();
    fs.writeFileSync(path.join(invalidRoot, "sample.yaml"), "null\n");
    expect(loadDatasets(invalidRoot).errors[0]?.messages[0]).toContain("(root)");
  });

  it("rejects oversized files and non-file dataset entries", () => {
    const oversized = makeTempDir();
    fs.writeFileSync(
      path.join(oversized, "sample.yaml"),
      "x".repeat(MAX_DATASET_FILE_BYTES + 1),
    );
    expect(loadDatasets(oversized).errors[0]?.messages).toContain(
      `dataset file exceeds ${MAX_DATASET_FILE_BYTES} bytes`,
    );

    const linked = makeTempDir();
    fs.symlinkSync(path.join(oversized, "sample.yaml"), path.join(linked, "sample.yaml"));
    expect(loadDatasets(linked).errors[0]?.messages).toContain(
      "dataset entry must be a regular file",
    );
  });

  it("reports file metadata failures", () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, "sample.yaml"), validYaml);
    const stat = vi.spyOn(fs, "lstatSync").mockImplementationOnce(() => {
      throw "metadata unavailable";
    });
    expect(loadDatasets(dir).errors[0]?.messages[0]).toContain(
      "metadata unavailable",
    );
    stat.mockRestore();
  });

  it("reports non-Error file read failures", () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, "sample.yaml"), validYaml);
    const read = vi.spyOn(fs, "readFileSync").mockImplementationOnce(() => {
      throw "disk unavailable";
    });

    expect(loadDatasets(dir).errors[0]?.messages[0]).toContain("disk unavailable");
    read.mockRestore();
  });

  it("reports duplicate identifiers", () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, "sample.yaml"), validYaml);
    fs.writeFileSync(
      path.join(dir, "other.yaml"),
      validYaml.replace("name: Sample", "name: Other"),
    );

    expect(loadDatasets(dir).errors.flatMap((error) => error.messages)).toContain(
      'duplicate id "sample" (also in other.yaml)',
    );
  });

  it("reports missing and empty dataset catalogs", () => {
    const missing = path.join(makeTempDir(), "missing");
    expect(loadDatasets(missing).errors[0]?.messages).toContain(
      "dataset directory does not exist",
    );

    const empty = makeTempDir();
    fs.writeFileSync(path.join(empty, "_template.yaml"), validYaml);
    expect(loadDatasets(empty).errors[0]?.messages).toContain(
      "no dataset YAML files found",
    );
  });

  it("reports directory read failures without throwing", () => {
    const dir = makeTempDir();
    const read = vi.spyOn(fs, "readdirSync").mockImplementationOnce(() => {
      throw new Error("permission denied");
    });

    expect(loadDatasets(dir)).toEqual({
      datasets: [],
      errors: [
        {
          file: dir,
          messages: ["Dataset directory error: Error: permission denied"],
        },
      ],
    });
    read.mockRestore();
  });

  it("exposes catalog helpers, stable sorting, and lookup", () => {
    expect(getDatasetsDir()).toMatch(/data\/datasets$/);
    expect(listDatasetFiles(path.join(makeTempDir(), "missing"))).toEqual([]);

    const dir = makeTempDir();
    fs.writeFileSync(
      path.join(dir, "zulu.yaml"),
      validYaml
        .replace("id: sample", "id: zulu")
        .replace("name: Sample", "name: Alpha"),
    );
    fs.writeFileSync(
      path.join(dir, "alpha.yaml"),
      validYaml
        .replace("id: sample", "id: alpha")
        .replace("name: Sample", "name: Zulu"),
    );

    expect(listDatasetFiles(dir)).toEqual(["alpha.yaml", "zulu.yaml"]);
    expect(getAllDatasets(dir).map((dataset) => dataset.id)).toEqual([
      "zulu",
      "alpha",
    ]);
    expect(getDatasetById("alpha", dir)?.name).toBe("Zulu");
    expect(getDatasetById("missing", dir)).toBeUndefined();
  });

  it("reuses one catalog read for repeated lookups in the same process", () => {
    const dir = makeTempDir();
    const file = path.join(dir, "sample.yaml");
    fs.writeFileSync(file, validYaml);
    const read = vi.spyOn(fs, "readFileSync");

    expect(getDatasetById("sample", dir)?.id).toBe("sample");
    expect(getDatasetById("sample", dir)?.name).toBe("Sample");
    expect(
      read.mock.calls.filter(([target]) => String(target) === file),
    ).toHaveLength(1);
    read.mockRestore();
  });

  it("does not cache catalog reads during development", () => {
    const dir = makeTempDir();
    const file = path.join(dir, "sample.yaml");
    fs.writeFileSync(file, validYaml);
    vi.stubEnv("NODE_ENV", "development");
    const read = vi.spyOn(fs, "readFileSync");

    try {
      expect(getDatasetById("sample", dir)?.id).toBe("sample");
      expect(getDatasetById("sample", dir)?.name).toBe("Sample");
      expect(
        read.mock.calls.filter(([target]) => String(target) === file),
      ).toHaveLength(2);
    } finally {
      vi.unstubAllEnvs();
      read.mockRestore();
    }
  });

  it("throws one actionable error for an invalid catalog", () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, "sample.yaml"), "null\n");
    expect(() => getAllDatasets(dir)).toThrow(
      /Invalid dataset metadata:[\s\S]*sample\.yaml/,
    );
  });
});
