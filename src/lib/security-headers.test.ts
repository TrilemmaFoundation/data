import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("vercel security headers", () => {
  it("sets the same restrictive browser headers used by other Foundation sites", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      headers: Array<{
        source: string;
        headers: Array<{ key: string; value: string }>;
      }>;
    };
    const globalRule = config.headers.find((rule) => rule.source === "/(.*)");
    const headers = new Map(
      globalRule?.headers.map((header) => [header.key, header.value]),
    );
    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(headers.get("Content-Security-Policy")).toContain("va.vercel-scripts.com");
    expect(headers.get("Content-Security-Policy")).toContain("script-src 'self' 'unsafe-inline'");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
  });
});
