import { describe, expect, it } from "vitest";
import { getDatasetById } from "./datasets";
import { datasetJsonLd, datasetPath, serializeJsonLd, SITE_URL } from "./seo";

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
    const dataset = getDatasetById("iris")!;
    expect(datasetJsonLd(dataset)).not.toHaveProperty("temporalCoverage");
    expect(serializeJsonLd({ value: "</script>" })).toBe(
      '{"value":"\\u003c/script>"}',
    );
  });
});
