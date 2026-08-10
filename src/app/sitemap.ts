import type { MetadataRoute } from "next";
import { getAllDatasets } from "@/lib/datasets";
import { datasetPath, SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/graph`, changeFrequency: "monthly", priority: 0.5 },
    ...getAllDatasets().map((dataset) => ({
      url: `${SITE_URL}${datasetPath(dataset.id)}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
