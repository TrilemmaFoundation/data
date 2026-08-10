import { describe, expect, it } from "vitest";
import { validatePythonSyntax } from "./python-validation";

describe("validatePythonSyntax", () => {
  it("accepts Python and rejects shell or malformed input", () => {
    expect(validatePythonSyntax("import pandas as pd\nprint(pd.__name__)")).toBeNull();
    expect(validatePythonSyntax("python -m pip install pandas")).toContain(
      "SyntaxError",
    );
    expect(validatePythonSyntax("def broken(:")).toContain("SyntaxError");
  });
});
