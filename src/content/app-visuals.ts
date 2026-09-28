// Project marks and accent colors mirror Hypertrial website revision
// 914f1c0a5fa86b0f763ed99d57aac1564f342e53. These are local presentation assets.
type AppSlug = "titanskies" | "hyperoptions" | "travelcanary" | "househunter" | "rockyroad" | "stackingsats";
type AppVisual = {
  accent: `#${string}`;
  mark:
    | { kind: "image"; src: string }
    | { kind: "initial"; letter: "H" | "R" }
    | { kind: "wordmark"; src: string };
};

export const appVisuals = {
  titanskies: { accent: "#0369A1", mark: { kind: "image", src: "/apps/titanskies-white.webp" } },
  hyperoptions: { accent: "#DFAB40", mark: { kind: "initial", letter: "H" } },
  travelcanary: { accent: "#0F766E", mark: { kind: "image", src: "/apps/travelcanary-white.webp" } },
  househunter: { accent: "#56D1C8", mark: { kind: "initial", letter: "H" } },
  rockyroad: { accent: "#B95732", mark: { kind: "initial", letter: "R" } },
  stackingsats: { accent: "#F7931A", mark: { kind: "wordmark", src: "/apps/stackingsats.svg" } },
} as const satisfies Record<AppSlug, AppVisual>;
