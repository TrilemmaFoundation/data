import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadDatasets } from "./datasets";

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
update_frequency: static
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
});
