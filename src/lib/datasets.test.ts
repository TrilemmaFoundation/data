import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearDatasetCacheForTests,
  getActiveDatasets,
  getAllDatasets,
  getCatalogDatasets,
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
  it("assigns every dataset to the curated catalog theme", () => {
    const themes = Object.fromEntries(
      getAllDatasets().map((dataset) => [dataset.id, dataset.theme]),
    );
    const groups = {
      "Environment & Hazards": ["airnow-air-quality", "epa-airdata-daily-summaries", "epa-echo-drinking-water", "epa-toxics-release-inventory", "fema-national-flood-hazard-layer", "gdacs-disaster-alerts", "nasa-firms", "nasa-power-daily", "noaa-ibtracs", "noaa-swpc-space-weather", "nws-weather-api", "noaa-ncei-daily-summaries", "noaa-tides-currents", "openfema-disaster-declarations", "us-drought-monitor", "usgs-earthquakes", "usgs-water-data", "met-norway-locationforecast", "noaa-storm-events", "noaa-gml-co2", "nsidc-sea-ice-index", "noaa-ndbc-buoys", "epa-ghgrp", "fema-nfip-redacted-claims", "gfw-tree-cover-loss", "smithsonian-gvp-volcanoes", "copernicus-era5", "water-quality-portal", "openaq-air-quality"],
      "Government & Policy": ["congress-gov-legislation", "fec-campaign-finance", "federal-register-documents", "ofac-sdn-list", "open-states-legislation", "sam-gov-contract-opportunities", "usaspending-federal-awards", "legislation-gov-uk", "uk-police-street-crime", "fbi-crime-data-explorer", "nih-reporter-projects", "nsf-awards", "grants-gov-opportunities", "senate-lda-filings", "regulations-gov-dockets", "govinfo-uscourts", "medsl-county-returns", "un-sc-consolidated-list", "osha-enforcement", "eur-lex-cellar"],
      "Markets & Economics": ["bea-regional-gdp-income", "bls-public-data-api", "census-international-trade", "cfpb-consumer-complaints", "eia-weekly-petroleum-status", "fhfa-house-price-index", "fred-economic-series", "hud-fair-market-rents", "imf-world-economic-outlook", "kalshi-market-data", "polymarket-markets", "sec-edgar-apis", "treasury-securities-auctions", "gleif-lei", "companies-house-uk", "fdic-bank-find", "cftc-commitment-of-traders", "census-county-business-patterns", "ecb-statistical-data-warehouse", "oecd-sdmx-statistics", "un-comtrade", "ilostat-labour-statistics", "irs-soi-tax-stats", "treasury-debt-to-the-penny", "hmda-loan-applications", "eia-weekly-natural-gas", "entsoe-transparency", "census-building-permits", "ember-electricity"],
      "Health, Food & Safety": ["cdc-fluview-ilinet", "cdc-places", "clinicaltrials-studies", "cms-care-compare-hospitals", "cms-open-payments", "cpsc-product-recalls", "nhtsa-vehicle-recalls", "nppes-npi-registry", "openfda-drug-adverse-events", "openfda-food-enforcement", "usda-fooddata-central", "open-food-facts", "cms-nursing-homes", "cdc-social-vulnerability-index", "fda-orange-book", "nchs-provisional-mortality", "nhanes", "cdc-uscs-cancer-statistics", "nhtsa-fars", "openfda-device-events", "dailymed-drug-labels", "cdc-nwss-wastewater"],
      "Geospatial & Infrastructure": ["bts-airline-on-time", "census-tiger-line", "eia-hourly-electric-grid", "fcc-national-broadband-map", "fhwa-national-bridge-inventory", "fta-ntd-monthly-ridership", "mobility-database-feeds", "natural-earth", "nrel-alt-fuel-stations", "overture-maps-places", "osm-overpass", "ourairports", "census-lehd-lodes", "ntsb-aviation-accidents"],
      "Research & Reference": ["arxiv-preprints", "crossref-works", "gbif-species-occurrences", "openalex-scholarly-works", "pubmed-citations", "wikimedia-pageviews", "wikidata-query", "uspto-open-data-portal", "pubchem-compounds"],
      "Technology & Cybersecurity": ["cisa-known-exploited-vulnerabilities", "deps-dev-package-graph", "mitre-attack-enterprise", "nvd-cve", "osv-open-source-vulnerabilities", "first-epss", "openssf-scorecard", "github-archive", "chrome-ux-report", "certificate-transparency-crtsh", "ripe-stat"],
      "Demographics & Development": ["acs-five-year-estimates", "college-scorecard", "eurostat-statistics", "nces-common-core-of-data", "unhcr-refugee-population", "usda-nass-quick-stats", "world-development-indicators", "onet-occupations", "worldpop-population", "who-gho-indicators", "faostat-food-agriculture", "ons-statistics", "statcan-web-data", "idmc-internal-displacement", "unesco-uis-statistics"],
    } as const;
    const grouped = Object.values(groups).flat();
    expect([...Object.keys(themes)].sort()).toEqual([...grouped].sort());
    for (const [theme, ids] of Object.entries(groups)) {
      for (const id of ids) expect(themes[id], id).toBe(theme);
    }
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
    expect(getActiveDatasets().every((dataset) => dataset.catalog_status === "active")).toBe(true);
    expect(getCatalogDatasets()[0]?.first_project_title).toBeTruthy();
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
