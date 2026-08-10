import type { spawnSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { validatePythonSyntax } from "./python-validation";

describe("validatePythonSyntax", () => {
  it("accepts Python and rejects shell or malformed input", () => {
    expect(validatePythonSyntax("import pandas as pd\nprint(pd.__name__)")).toBeNull();
    expect(validatePythonSyntax("python -m pip install pandas")).toContain(
      "SyntaxError",
    );
    expect(validatePythonSyntax("def broken(:")).toContain("SyntaxError");
  });

  it("falls back between Python executables and reports unavailable compilers", () => {
    const missing = Object.assign(new Error("missing"), { code: "ENOENT" });
    const spawn = vi.fn()
      .mockReturnValueOnce({ error: missing, status: null, stderr: "" })
      .mockReturnValueOnce({ status: 1, stderr: "" }) as unknown as typeof spawnSync;

    expect(validatePythonSyntax("broken", spawn)).toBe(
      "python could not compile the example",
    );
    expect(spawn).toHaveBeenCalledTimes(2);

    const unavailable = vi.fn().mockReturnValue({
      error: missing,
      status: null,
      stderr: "",
    }) as unknown as typeof spawnSync;
    expect(validatePythonSyntax("print('ok')", unavailable)).toBe(
      "Python is required to validate getting_started.python.code",
    );
  });

  it("reports non-ENOENT spawn errors", () => {
    const spawn = vi.fn().mockReturnValue({
      error: Object.assign(new Error("denied"), { code: "EACCES" }),
      status: null,
      stderr: "permission denied",
    }) as unknown as typeof spawnSync;
    expect(validatePythonSyntax("print('ok')", spawn)).toBe("denied");
  });
});
