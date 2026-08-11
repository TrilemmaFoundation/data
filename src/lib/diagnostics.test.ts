import { describe, expect, it } from "vitest";
import { sanitizeDiagnostic } from "./diagnostics";

describe("sanitizeDiagnostic", () => {
  it("preserves printable text", () => {
    expect(sanitizeDiagnostic("dataset.yaml: invalid value")).toBe(
      "dataset.yaml: invalid value",
    );
  });

  it("renders control characters as visible escapes", () => {
    expect(sanitizeDiagnostic("line\nnext\t\u001b\u007f\u009b")).toBe(
      "line\\u000anext\\u0009\\u001b\\u007f\\u009b",
    );
  });
});
