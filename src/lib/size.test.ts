import { describe, expect, it } from "vitest";
import {
  formatSizeRange,
  getSizeCategory,
  sizeOverlapsCategory,
} from "./size";

describe("size helpers", () => {
  it("categorizes by size_gb_max", () => {
    expect(getSizeCategory(0.001)).toBe("Tiny");
    expect(getSizeCategory(0.5)).toBe("Small");
    expect(getSizeCategory(1)).toBe("Medium");
    expect(getSizeCategory(5)).toBe("Medium");
    expect(getSizeCategory(50)).toBe("Large");
    expect(getSizeCategory(100)).toBe("Very Large");
    expect(getSizeCategory(500)).toBe("Very Large");
    expect(getSizeCategory(1000)).toBe("Very Large");
    expect(getSizeCategory(1500)).toBe("Massive");
  });

  it("formats ranges usefully", () => {
    expect(formatSizeRange(0, 0)).toBe("<0.001 GB");
    expect(formatSizeRange(2, 2)).toBe("2 GB");
    expect(formatSizeRange(1.2345, 1.2345)).toBe("1.23 GB");
    expect(formatSizeRange(0, 0.0001)).toBe("<0.001 GB");
    expect(formatSizeRange(0, 0.001)).toBe("≤0.001 GB");
    expect(formatSizeRange(0, 1)).toBe("≤1 GB");
    expect(formatSizeRange(0.2, 0.5)).toBe("0.2–0.5 GB");
    expect(formatSizeRange(0.0001, 0.0002)).toBe("1e-4–2e-4 GB");
  });

  it("detects category overlap aligned with getSizeCategory", () => {
    expect(sizeOverlapsCategory(0.05, 0.1, "Tiny")).toBe(true);
    expect(sizeOverlapsCategory(0.2, 0.3, "Tiny")).toBe(false);
    expect(sizeOverlapsCategory(0.05, 0.1, "Small")).toBe(true);
    expect(sizeOverlapsCategory(2, 3, "Small")).toBe(false);
    expect(sizeOverlapsCategory(0.05, 0.1, "Medium")).toBe(false);
    expect(sizeOverlapsCategory(2, 3, "Medium")).toBe(true);
    expect(sizeOverlapsCategory(20, 30, "Large")).toBe(true);
    expect(sizeOverlapsCategory(2, 3, "Large")).toBe(false);
    expect(sizeOverlapsCategory(0.1, 1, "Small")).toBe(true);
    expect(sizeOverlapsCategory(1000, 1000, "Very Large")).toBe(true);
    expect(sizeOverlapsCategory(10, 20, "Very Large")).toBe(false);
    expect(sizeOverlapsCategory(1000, 1000, "Massive")).toBe(false);
    expect(sizeOverlapsCategory(1000.1, 1000.1, "Massive")).toBe(true);
  });
});
