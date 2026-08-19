import { isActiveDataset, type Dataset } from "./schema";

export const PYTHON_RUNTIME_CANARIES = [
  "nws-weather-api",
  "usgs-earthquakes",
  "cisa-known-exploited-vulnerabilities",
] as const;

export const PYTHON_RUNTIME_TIMEOUT_MS = 30_000;
export const PYTHON_RUNTIME_MAX_OUTPUT_BYTES = 8_192;
export const PYTHON_RUNTIME_CONCURRENCY = 2;

export const PYTHON_ALLOWED_PACKAGES = [
  "pandas",
  "requests",
  "numpy",
] as const;

export function disallowedPythonPackages(packages: readonly string[]): string[] {
  const allowed = new Set(
    PYTHON_ALLOWED_PACKAGES.map((value) => value.toLocaleLowerCase("en-US")),
  );
  return packages.filter(
    (value) => !allowed.has(value.toLocaleLowerCase("en-US")),
  );
}

export function selectPythonRuntimeCanaries(datasets: Dataset[]): {
  selected: Dataset[];
  errors: string[];
} {
  const byId = new Map(datasets.map((dataset) => [dataset.id, dataset]));
  const selected: Dataset[] = [];
  const errors: string[] = [];
  for (const id of PYTHON_RUNTIME_CANARIES) {
    const dataset = byId.get(id);
    if (!dataset) {
      errors.push(`${id}: allowlisted but missing from the catalog`);
      continue;
    }
    if (!isActiveDataset(dataset)) {
      errors.push(`${id}: allowlisted but not active`);
      continue;
    }
    selected.push(dataset);
  }
  return { selected, errors };
}

const CANARY_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseCanaryFailureLines(raw: string): string[] {
  const failures: string[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf(": ");
    if (separator <= 0) continue;
    const id = trimmed.slice(0, separator);
    const detail = trimmed.slice(separator + 2);
    // Synthetic CI lines such as `pip-install: ...` share the canary id pattern.
    if (!CANARY_ID_PATTERN.test(id) || detail === "ok") continue;
    failures.push(trimmed);
  }
  return failures;
}
