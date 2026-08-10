import { spawnSync } from "node:child_process";

const COMPILE_SCRIPT =
  'import sys; compile(sys.stdin.read(), "<dataset guide>", "exec")';

type Spawn = typeof spawnSync;

export function validatePythonSyntax(
  code: string,
  spawn: Spawn = spawnSync,
): string | null {
  for (const executable of ["python3", "python"]) {
    const result = spawn(executable, ["-c", COMPILE_SCRIPT], {
      input: code,
      encoding: "utf8",
    });
    if (result.error && "code" in result.error && result.error.code === "ENOENT") {
      continue;
    }
    if (result.error) return result.error.message;
    if (result.status === 0) return null;
    return (
      result.stderr?.toString().trim() ||
      `${executable} could not compile the example`
    );
  }
  return "Python is required to validate getting_started.python.code";
}
