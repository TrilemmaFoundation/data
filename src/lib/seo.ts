import type { Dataset } from "./schema";

export const SITE_URL = "https://data.trilemma.foundation";
export const FOUNDATION_URL = "https://www.trilemma.foundation/";
export const FOUNDATION_PROJECTS_URL = `${FOUNDATION_URL}projects`;
export const FOUNDATION_TOURNAMENTS_URL = `${FOUNDATION_URL}tournaments`;
export const FOUNDATION_TEAM_URL = `${FOUNDATION_URL}team`;
export const FOUNDATION_CHARTER_URL = `${FOUNDATION_URL}charter`;
export const FOUNDATION_PRIVACY_URL = `${FOUNDATION_URL}privacy`;
export const FOUNDATION_TERMS_URL = `${FOUNDATION_URL}terms`;
export const CONTRIBUTE_URL =
  "https://github.com/TrilemmaFoundation/data/blob/main/CONTRIBUTING.md";

export function datasetPath(id: string): string {
  return `/datasets/${id}`;
}

export function datasetJsonLd(dataset: Dataset) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: dataset.name,
    description: dataset.description,
    url: `${SITE_URL}${datasetPath(dataset.id)}`,
    sameAs: dataset.url,
    license: dataset.license_url,
    isAccessibleForFree: true,
    creator: {
      "@type": "Organization",
      name: dataset.provider,
    },
    keywords: [...dataset.domains, ...dataset.data_types, ...dataset.tasks],
    spatialCoverage: dataset.geography,
    ...(dataset.temporal_coverage
      ? { temporalCoverage: dataset.temporal_coverage }
      : {}),
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
