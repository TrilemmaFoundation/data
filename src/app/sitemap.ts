import type { MetadataRoute } from "next";
import { getActiveDatasets } from "@/lib/datasets";
import { getAllCollections } from "@/lib/collections";
import { allThemeSlugs, themePath } from "@/lib/landing";
import {
  collectionPath,
  COLLECTIONS_PATH,
  CONTRIBUTE_APP_PATH,
  datasetPath,
  SITE_URL,
} from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}${COLLECTIONS_PATH}`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}${CONTRIBUTE_APP_PATH}`, changeFrequency: "monthly", priority: 0.4 },
    ...allThemeSlugs().map(({ theme }) => ({
      url: `${SITE_URL}${themePath(theme)}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...getAllCollections().map((collection) => ({
      url: `${SITE_URL}${collectionPath(collection.id)}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...getActiveDatasets().map((dataset) => ({
      url: `${SITE_URL}${datasetPath(dataset.id)}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
