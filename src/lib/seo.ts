import type { Dataset } from "./schema";
import { isActiveDataset } from "./schema";
import { themePath } from "./landing";
import type { DatasetTheme } from "./schema";

export const SITE_URL = "https://data.trilemma.foundation";
export const FOUNDATION_URL = "https://www.trilemma.foundation/";
export const FOUNDATION_PROJECTS_URL = `${FOUNDATION_URL}projects`;
export const FOUNDATION_TOURNAMENTS_URL = `${FOUNDATION_URL}tournaments`;
export const FOUNDATION_TEAM_URL = `${FOUNDATION_URL}team`;
export const FOUNDATION_CHARTER_URL = `${FOUNDATION_URL}charter`;
export const FOUNDATION_PRIVACY_URL = `${FOUNDATION_URL}privacy`;
export const FOUNDATION_TERMS_URL = `${FOUNDATION_URL}terms`;
export const GITHUB_REPO_URL = "https://github.com/TrilemmaFoundation/data";
export const CONTRIBUTE_URL = `${GITHUB_REPO_URL}/blob/main/CONTRIBUTING.md`;
export const CONTRIBUTE_APP_PATH = "/contribute";
export const COLLECTIONS_PATH = "/collections";
export const COMPARE_PATH = "/compare";
export const FEEDBACK_URL = `${GITHUB_REPO_URL}/issues/new?template=usability.yml`;
export const DATASET_ISSUE_URL = `${GITHUB_REPO_URL}/issues/new?template=dataset.yml`;

export function datasetPath(id: string): string {
  return `/datasets/${id}`;
}

export function collectionPath(id: string): string {
  return `/collections/${id}`;
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
    ...(isActiveDataset(dataset) ? {} : { creativeWorkStatus: dataset.catalog_status }),
  };
}

export function collectionJsonLd(
  collection: { id: string; title: string; summary: string },
  names: string[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: collection.title,
    description: collection.summary,
    url: `${SITE_URL}${collectionPath(collection.id)}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: names.length,
      itemListElement: names.map((name, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name,
      })),
    },
  };
}

export function themeJsonLd(theme: DatasetTheme, names: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: theme,
    description: `Actively maintained datasets in ${theme}.`,
    url: `${SITE_URL}${themePath(theme)}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: names.length,
      itemListElement: names.map((name, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name,
      })),
    },
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
