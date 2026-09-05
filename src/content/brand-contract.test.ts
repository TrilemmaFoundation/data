import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("brand contract", () => {
  it("keeps the canonical Trilemma colors", () => {
    const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
    const tokens = readFileSync(join(root, "src/design/tokens.css"), "utf8").toLowerCase();
    for (const value of ["#1e1e44", "#0a0a14", "#ff9940", "#5858c8", "#8e8ecd", "#ffc999", "#f1f1f9"]) {
      expect(tokens).toContain(value);
    }
    expect(css).toContain("--background: var(--tf-ghost-white)");
    expect(css).toContain("--foreground: var(--tf-ink-black)");
    expect(css).toContain("--primary: var(--tf-soft-periwinkle)");
    expect(tokens).toContain("--tf-action-primary-hover-foreground: var(--tf-ghost-white)");
  });

  it("keeps the canonical Foundation logo", () => {
    const logo = readFileSync(join(root, "public/foundation-white.webp"));
    expect(createHash("sha256").update(logo).digest("hex")).toBe(
      "36eed433476530b3e8f97ba9612c08bde3590cf6d2e15b2bd0ff7b7dde90a023",
    );
  });
});
