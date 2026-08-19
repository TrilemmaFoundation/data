import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mapPool } from "../src/lib/async-pool";
import { getAllDatasets } from "../src/lib/datasets";
import {
  disallowedPythonPackages,
  PYTHON_RUNTIME_CONCURRENCY,
  PYTHON_RUNTIME_MAX_OUTPUT_BYTES,
  PYTHON_RUNTIME_TIMEOUT_MS,
  selectPythonRuntimeCanaries,
} from "../src/lib/python-runtime";
import { sanitizeDiagnostic } from "../src/lib/diagnostics";

function runExample(code: string, packages: string[]): string | null {
  const disallowed = disallowedPythonPackages(packages);
  if (disallowed.length > 0) {
    return `disallowed packages: ${disallowed.join(", ")}`;
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "trilemma-canary-"));
  const file = path.join(dir, "example.py");
  fs.writeFileSync(file, code);
  const result = spawnSync("python3", [file], {
    encoding: "utf8",
    timeout: PYTHON_RUNTIME_TIMEOUT_MS,
    maxBuffer: PYTHON_RUNTIME_MAX_OUTPUT_BYTES,
    windowsHide: true,
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
  });
  fs.rmSync(dir, { recursive: true, force: true });

  if (result.error && "code" in result.error && result.error.code === "ENOENT") {
    return "python3 is required to run runtime canaries";
  }
  if (result.error) return result.error.message;
  if (result.status === 0) return null;
  const stderr = result.stderr?.toString().trim();
  const stdout = result.stdout?.toString().trim();
  return stderr || stdout || `python3 exited with status ${result.status}`;
}

async function main() {
  const { selected, errors } = selectPythonRuntimeCanaries(getAllDatasets());
  for (const error of errors) {
    console.error(sanitizeDiagnostic(error));
  }
  const results = await mapPool(selected, PYTHON_RUNTIME_CONCURRENCY, async (dataset) => {
    const error = runExample(
      dataset.getting_started.python.code,
      dataset.getting_started.python.packages,
    );
    return { id: dataset.id, error };
  });

  const failures = results.filter((result) => result.error);
  for (const result of results) {
    if (result.error) {
      console.error(sanitizeDiagnostic(`${result.id}: ${result.error}`));
    } else {
      console.log(`${result.id}: ok`);
    }
  }

  if (errors.length > 0 || failures.length > 0) {
    process.exit(1);
  }
}

void main();
