import { describe, expect, it } from "vitest";
import { cn, stretchedLinkClassName } from "./utils";

describe("cn", () => {
  it("combines conditional classes and resolves Tailwind conflicts", () => {
    expect(cn("px-2", false && "hidden", "px-4")).toBe("px-4");
  });

  it("keeps a full-card stretched link overlay class", () => {
    expect(stretchedLinkClassName).toContain("after:inset-0");
  });
});
