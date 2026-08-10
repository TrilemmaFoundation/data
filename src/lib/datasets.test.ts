import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAllDatasets,
  getDatasetById,
  getDatasetsDir,
  listDatasetFiles,
  loadDatasets,
} from "./datasets";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "datasets-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const validYaml = `
id: sample
name: Sample
description: A sample dataset.
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
    fs.writeFileSync(
      path.join(dir, "other.yaml"),
      validYaml.replace("id: sample", "id: sample"),
    );

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

  it("throws one actionable error for an invalid catalog", () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, "sample.yaml"), "null\n");
    expect(() => getAllDatasets(dir)).toThrow(
      /Invalid dataset metadata:[\s\S]*sample\.yaml/,
    );
  });
});
