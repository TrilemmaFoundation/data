import { describe, expect, it } from "vitest";
import sitemap from "../app/sitemap";
import { contributeCopy } from "../content/site-copy";
import { getDatasetById } from "./datasets";
import { getAllCollections } from "./collections";
import * as seo from "./seo";
import {
  collectionJsonLd,
  collectionPath,
  datasetJsonLd,
  datasetPath,
  serializeJsonLd,
  pageSocialMetadata,
  SITE_URL,
  themeJsonLd,
} from "./seo";

describe("SEO helpers", () => {
  it("builds complete dataset structured data", () => {
    const dataset = getDatasetById("world-development-indicators")!;
    expect(datasetPath(dataset.id)).toBe("/datasets/world-development-indicators");
    expect(datasetJsonLd(dataset)).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Dataset",
      url: `${SITE_URL}/datasets/world-development-indicators`,
      sameAs: dataset.url,
      license: dataset.license_url,
      temporalCoverage: dataset.temporal_coverage,
      creator: { name: dataset.provider },
    });
  });

  it("omits absent temporal coverage and safely serializes markup", () => {
    const dataset = getDatasetById("natural-earth")!;
    expect(datasetJsonLd(dataset)).not.toHaveProperty("temporalCoverage");
    expect(serializeJsonLd({ value: "</script>" })).toBe(
      '{"value":"\\u003c/script>"}',
    );
  });

  it("builds collection and theme structured data", () => {
    const collection = getAllCollections()[0]!;
    expect(collectionPath(collection.id)).toBe(`/collections/${collection.id}`);
    expect(collectionJsonLd(collection, ["National Weather Service API"])).toMatchObject({
      "@type": "CollectionPage",
      name: collection.title,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: 1,
      },
    });
    expect(themeJsonLd("Environment & Hazards", ["USGS Earthquake Catalog"])).toMatchObject({
      "@type": "CollectionPage",
      url: `${SITE_URL}/themes/environment-hazards`,
    });
    const inactive = {
      ...getDatasetById("natural-earth")!,
      catalog_status: "deprecated" as const,
    };
    expect(datasetJsonLd(inactive)).toMatchObject({ creativeWorkStatus: "deprecated" });
  });

  it("sets matching canonical and social URLs for public routes", () => {
    const metadata = pageSocialMetadata("/contribute", contributeCopy.title, "Draft a dataset YAML file");
    expect(metadata.alternates).toEqual({ canonical: "/contribute" });
    expect(metadata.openGraph).toMatchObject({
      url: "/contribute",
      title: contributeCopy.title,
      description: "Draft a dataset YAML file",
    });
    expect(metadata.twitter).toMatchObject({
      title: contributeCopy.title,
      images: ["/foundation-white.webp"],
    });
  });

  it("does not advertise a compare route in constants or the sitemap", () => {
    expect(Object.keys(seo).filter((key) => /compare/i.test(key))).toEqual([]);
    expect(sitemap().map((entry) => entry.url)).not.toContain(`${SITE_URL}/compare`);
  });
});
