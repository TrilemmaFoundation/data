import { DATASET_THEMES, type DatasetTheme } from "./schema";

const THEME_SLUGS = {
  "Environment & Hazards": "environment-hazards",
  "Government & Policy": "government-policy",
  "Markets & Economics": "markets-economics",
  "Health, Food & Safety": "health-food-safety",
  "Geospatial & Infrastructure": "geospatial-infrastructure",
  "Research & Reference": "research-reference",
  "Technology & Cybersecurity": "technology-cybersecurity",
  "Demographics & Development": "demographics-development",
} as const satisfies Record<DatasetTheme, string>;

const SLUG_TO_THEME = Object.fromEntries(
  Object.entries(THEME_SLUGS).map(([theme, slug]) => [slug, theme]),
) as Record<string, DatasetTheme>;

export function themeSlug(theme: DatasetTheme): string {
  return THEME_SLUGS[theme];
}

export function themeFromSlug(slug: string): DatasetTheme | null {
  return Object.hasOwn(SLUG_TO_THEME, slug) ? SLUG_TO_THEME[slug]! : null;
}

export function allThemeSlugs(): Array<{ theme: DatasetTheme; slug: string }> {
  return DATASET_THEMES.map((theme) => ({ theme, slug: THEME_SLUGS[theme] }));
}

export function themePath(theme: DatasetTheme): string {
  return `/themes/${themeSlug(theme)}`;
}
