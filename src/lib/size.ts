export const SIZE_CATEGORIES = [
  "Tiny",
  "Small",
  "Medium",
  "Large",
  "Very Large",
  "Massive",
] as const;

export type SizeCategory = (typeof SIZE_CATEGORIES)[number];

/**
 * Categorize by size_gb_max — the practical "you'll need up to this much space" signal.
 *
 * Boundaries match the v1 spec:
 * Tiny <0.1, Small 0.1–1, Medium 1–10, Large 10–100,
 * Very Large 100–1,000, Massive >1,000.
 * Shared lower bounds go to the higher bucket (e.g. exactly 1 GB → Medium).
 * Exactly 1,000 GB remains Very Large; Massive is strictly greater.
 */
export function getSizeCategory(sizeGbMax: number): SizeCategory {
  if (sizeGbMax < 0.1) return "Tiny";
  if (sizeGbMax < 1) return "Small";
  if (sizeGbMax < 10) return "Medium";
  if (sizeGbMax < 100) return "Large";
  if (sizeGbMax <= 1000) return "Very Large";
  return "Massive";
}

export function formatSizeRange(min: number, max: number): string {
  if (min === max) {
    if (max === 0) return "<0.001 GB";
    return `${formatGb(max)} GB`;
  }
  if (min === 0 && max < 0.001) return "<0.001 GB";
  if (min === 0) return `≤${formatGb(max)} GB`;
  return `${formatGb(min)}–${formatGb(max)} GB`;
}

function formatGb(value: number): string {
  if (value < 0.001) return value.toExponential(0);
  if (value < 1) {
    const rounded = Number(value.toPrecision(2));
    return String(rounded);
  }
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toPrecision(3)));
}

/**
 * True when the dataset size range intersects values that map to `category`
 * under {@link getSizeCategory}.
 */
export function sizeOverlapsCategory(
  sizeGbMin: number,
  sizeGbMax: number,
  category: SizeCategory,
): boolean {
  // Half-open intervals aligned with getSizeCategory, except Very Large which
  // is closed on the right so exactly 1000 GB stays Very Large.
  switch (category) {
    case "Tiny":
      return sizeGbMin < 0.1 && sizeGbMax >= 0;
    case "Small":
      return sizeGbMin < 1 && sizeGbMax >= 0.1;
    case "Medium":
      return sizeGbMin < 10 && sizeGbMax >= 1;
    case "Large":
      return sizeGbMin < 100 && sizeGbMax >= 10;
    case "Very Large":
      return sizeGbMin <= 1000 && sizeGbMax >= 100;
    case "Massive":
      return sizeGbMax > 1000;
  }
}
