import { spawnSync } from "node:child_process";

export const COMPILE_SCRIPT = [
  "import json, sys",
  "for line in sys.stdin:",
  "    rec = json.loads(line)",
  "    try:",
  '        compile(rec["code"], "<dataset guide>", "exec")',
  '        print(\'{"ok":true}\', flush=True)',
  "    except Exception as e:",
  "        err = type(e).__name__ + ': ' + str(e)",
  '        print(json.dumps({"ok": False, "error": err}), flush=True)',
].join("\n");
const COMPILE_TIMEOUT_MS = 5_000;
const MAX_COMPILER_OUTPUT_BYTES = 1_000_000;

type Spawn = typeof spawnSync;

export function validatePythonSyntax(
  code: string,
  spawn: Spawn = spawnSync,
): string | null {
  return validatePythonSyntaxBatch([code], spawn)[0] as string | null;
}

export function validatePythonSyntaxBatch(
  codes: string[],
  spawn: Spawn = spawnSync,
): Array<string | null> {
  if (codes.length === 0) return [];

  const input = codes.map((code) => JSON.stringify({ code })).join("\n") + "\n";
  for (const executable of ["python3", "python"]) {
    const result = spawn(executable, ["-c", COMPILE_SCRIPT], {
      input,
      encoding: "utf8",
      timeout: COMPILE_TIMEOUT_MS * codes.length,
      maxBuffer: MAX_COMPILER_OUTPUT_BYTES,
      windowsHide: true,
    });
    if (result.error && "code" in result.error && result.error.code === "ENOENT") {
      continue;
    }
    if (result.error) {
      return codes.map(() => result.error!.message);
    }
    if (result.status === 0) {
      return parseBatchOutput(codes, result.stdout?.toString() ?? "");
    }
    const fallback =
      result.stderr?.toString().trim() ||
      `${executable} could not compile the example`;
    return parseBatchOutput(codes, result.stdout?.toString() ?? "", fallback);
  }
  return codes.map(() => "Python is required to validate getting_started.python.code");
}

function parseBatchOutput(
  codes: string[],
  stdout: string,
  fallback?: string,
): Array<string | null> {
  const lines = stdout.split(/\r?\n/).filter((line) => line.length > 0);
  return codes.map((_, index) => {
    const line = lines[index];
    if (!line) return fallback ?? "Python did not return a compile result";
    try {
      const parsed = JSON.parse(line) as { ok?: boolean; error?: string };
      if (parsed.ok) return null;
      return parsed.error?.trim() || fallback || "Python could not compile the example";
    } catch {
      return fallback ?? "Python did not return a compile result";
    }
  });
}
