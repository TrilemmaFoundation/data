import { describe, expect, it } from "vitest";
import { getDatasetById } from "./datasets";
import { getAllCollections } from "./collections";
import {
  collectionJsonLd,
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
    const metadata = pageSocialMetadata("/compare", "Compare datasets", "Side by side");
    expect(metadata.alternates).toEqual({ canonical: "/compare" });
    expect(metadata.openGraph).toMatchObject({
      url: "/compare",
      title: "Compare datasets",
      description: "Side by side",
    });
    expect(metadata.twitter).toMatchObject({
      title: "Compare datasets",
      images: ["/foundation-white.webp"],
    });
  });
});
