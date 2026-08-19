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

export function isPythonRuntimeCanary(id: string): boolean {
  return (PYTHON_RUNTIME_CANARIES as readonly string[]).includes(id);
}
