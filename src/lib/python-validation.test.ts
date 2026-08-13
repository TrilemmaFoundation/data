import type { spawnSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import {
  COMPILE_SCRIPT,
  validatePythonSyntax,
  validatePythonSyntaxBatch,
} from "./python-validation";

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
      .mockReturnValueOnce({ status: 1, stderr: "", stdout: "" }) as unknown as typeof spawnSync;

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
    expect(spawn).toHaveBeenCalledWith(
      "python3",
      ["-c", COMPILE_SCRIPT],
      expect.objectContaining({
        timeout: 5_000,
        maxBuffer: 1_000_000,
        windowsHide: true,
      }),
    );
  });
});

describe("validatePythonSyntaxBatch", () => {
  it("returns an empty list without spawning", () => {
    const spawn = vi.fn() as unknown as typeof spawnSync;
    expect(validatePythonSyntaxBatch([], spawn)).toEqual([]);
    expect(spawn).not.toHaveBeenCalled();
  });

  it("compiles several examples in one interpreter", () => {
    expect(
      validatePythonSyntaxBatch([
        "print('ok')",
        "def broken(:",
        "value = 1",
      ]),
    ).toEqual([
      null,
      expect.stringContaining("SyntaxError"),
      null,
    ]);
  });

  it("parses mixed batch output and compiler failures", () => {
    const spawn = vi.fn().mockReturnValue({
      status: 1,
      stdout: '{"ok":true}\nnot-json\n{"ok":false}\n',
      stderr: "compiler failed",
    }) as unknown as typeof spawnSync;
    expect(validatePythonSyntaxBatch(["a", "b", "c", "d"], spawn)).toEqual([
      null,
      "compiler failed",
      "compiler failed",
      "compiler failed",
    ]);
  });

  it("reports incomplete or invalid compiler output", () => {
    const spawn = vi.fn().mockReturnValue({
      status: 0,
      stdout: '{"ok":false}\nnot-json\n',
      stderr: "",
    }) as unknown as typeof spawnSync;
    expect(validatePythonSyntaxBatch(["a", "b", "c"], spawn)).toEqual([
      "Python could not compile the example",
      "Python did not return a compile result",
      "Python did not return a compile result",
    ]);
  });

  it("treats missing stdout as empty compiler output", () => {
    const success = vi.fn().mockReturnValue({
      status: 0,
      stderr: "",
    }) as unknown as typeof spawnSync;
    expect(validatePythonSyntaxBatch(["print(1)"], success)).toEqual([
      "Python did not return a compile result",
    ]);

    const failure = vi.fn().mockReturnValue({
      status: 1,
      stderr: "",
    }) as unknown as typeof spawnSync;
    expect(validatePythonSyntaxBatch(["broken"], failure)).toEqual([
      "python3 could not compile the example",
    ]);
  });
});
