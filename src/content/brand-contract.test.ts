import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("brand contract", () => {
  it("keeps the canonical Trilemma colors", () => {
    const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
    const tokens = {
      "--brand-navy": "#1e1e44",
      "--brand-black": "#0a0a14",
      "--brand-orange": "#ff9940",
      "--brand-blue": "#6ca8e4",
      "--brand-white": "#ffffff",
      "--muted-foreground": "#bdbdbd",
    } as const;

    for (const [token, value] of Object.entries(tokens)) {
      expect(css).toContain(`${token}: ${value};`);
    }
  });

  it("keeps the canonical Foundation logo", () => {
    const logo = readFileSync(join(root, "public/foundation-white.webp"));
    expect(createHash("sha256").update(logo).digest("hex")).toBe(
      "36eed433476530b3e8f97ba9612c08bde3590cf6d2e15b2bd0ff7b7dde90a023",
    );
  });
});
