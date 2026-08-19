import { describe, expect, it } from "vitest";
import { getDatasetById } from "./datasets";
import {
  parseCanaryFailureLines,
  PYTHON_ALLOWED_PACKAGES,
  PYTHON_RUNTIME_CANARIES,
  PYTHON_RUNTIME_CONCURRENCY,
  PYTHON_RUNTIME_MAX_OUTPUT_BYTES,
  PYTHON_RUNTIME_TIMEOUT_MS,
  disallowedPythonPackages,
  selectPythonRuntimeCanaries,
} from "./python-runtime";

describe("python runtime canaries", () => {
  it("exposes a small allowlist and resource limits", () => {
    expect(PYTHON_RUNTIME_CANARIES).toContain("nws-weather-api");
    expect(PYTHON_RUNTIME_CANARIES).not.toContain("sec-edgar-apis");
    expect(disallowedPythonPackages(["pandas", "secretlib"])).toEqual(["secretlib"]);
    expect(disallowedPythonPackages(["Pandas"])).toEqual([]);
    expect(PYTHON_ALLOWED_PACKAGES).toContain("pandas");
    expect(PYTHON_RUNTIME_TIMEOUT_MS).toBeGreaterThan(0);
    expect(PYTHON_RUNTIME_MAX_OUTPUT_BYTES).toBeGreaterThan(0);
    expect(PYTHON_RUNTIME_CONCURRENCY).toBeGreaterThan(0);
  });

  it("fails closed when an allowlisted canary is missing or inactive", () => {
    const nws = getDatasetById("nws-weather-api")!;
    const usgs = getDatasetById("usgs-earthquakes")!;
    const cisa = getDatasetById("cisa-known-exploited-vulnerabilities")!;
    expect(selectPythonRuntimeCanaries([nws, usgs, cisa]).errors).toEqual([]);
    expect(selectPythonRuntimeCanaries([nws, usgs]).errors[0]).toContain(
      "cisa-known-exploited-vulnerabilities:",
    );
    expect(
      selectPythonRuntimeCanaries([
        nws,
        usgs,
        { ...cisa, catalog_status: "deprecated" },
      ]).errors[0],
    ).toContain("not active");
  });

  it("keeps only real canary failure lines from npm transcripts", () => {
    expect(
      parseCanaryFailureLines(`
> data@0.1.0 validate-python-runtime
> tsx scripts/validate-python-runtime.ts

nws-weather-api: ok
usgs-earthquakes: request failed
pip-install: ok
pip-install: python packages failed to install
`),
    ).toEqual([
      "usgs-earthquakes: request failed",
      "pip-install: python packages failed to install",
    ]);
  });
});
