import { describe, expect, it } from "vitest";
import {
  isPythonRuntimeCanary,
  PYTHON_ALLOWED_PACKAGES,
  PYTHON_RUNTIME_CANARIES,
  PYTHON_RUNTIME_CONCURRENCY,
  PYTHON_RUNTIME_MAX_OUTPUT_BYTES,
  PYTHON_RUNTIME_TIMEOUT_MS,
  disallowedPythonPackages,
} from "./python-runtime";

describe("python runtime canaries", () => {
  it("exposes a small allowlist and resource limits", () => {
    expect(PYTHON_RUNTIME_CANARIES).toContain("nws-weather-api");
    expect(isPythonRuntimeCanary("nws-weather-api")).toBe(true);
    expect(isPythonRuntimeCanary("sec-edgar-apis")).toBe(false);
    expect(disallowedPythonPackages(["pandas", "secretlib"])).toEqual(["secretlib"]);
    expect(disallowedPythonPackages(["Pandas"])).toEqual([]);
    expect(PYTHON_ALLOWED_PACKAGES).toContain("pandas");
    expect(PYTHON_RUNTIME_TIMEOUT_MS).toBeGreaterThan(0);
    expect(PYTHON_RUNTIME_MAX_OUTPUT_BYTES).toBeGreaterThan(0);
    expect(PYTHON_RUNTIME_CONCURRENCY).toBeGreaterThan(0);
  });
});
