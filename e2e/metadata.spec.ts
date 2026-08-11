import { expect, test } from "@playwright/test";
import { siteCopy } from "../src/content/site-copy";
import { getAllDatasets } from "../src/lib/datasets";

test("public routes expose canonical and social metadata", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
    "content",
    "strict-origin-when-cross-origin",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://data.trilemma.foundation",
  );
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
    "content",
    siteCopy.name,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
});

test("dataset guides expose canonical metadata and valid JSON-LD", async ({
  page,
}) => {
  await page.goto("/datasets/usgs-earthquakes");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://data.trilemma.foundation/datasets/usgs-earthquakes",
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "USGS Earthquake Catalog",
  );

  const jsonLd = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? "null",
  );
  expect(jsonLd).toMatchObject({
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "USGS Earthquake Catalog",
    url: "https://data.trilemma.foundation/datasets/usgs-earthquakes",
  });
  expect(jsonLd.keywords).toEqual(
    expect.arrayContaining(["Natural Hazards", "Geospatial", "Hazard Monitoring"]),
  );
});

test("robots and sitemap enumerate the public static application", async ({
  request,
}) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  await expect(robots.text()).resolves.toContain(
    "Sitemap: https://data.trilemma.foundation/sitemap.xml",
  );

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const body = await sitemap.text();
  expect(body).toContain("<loc>https://data.trilemma.foundation</loc>");
  const datasets = getAllDatasets();
  for (const dataset of datasets) {
    expect(body).toContain(
      `<loc>https://data.trilemma.foundation/datasets/${dataset.id}</loc>`,
    );
  }
  expect(body.match(/<loc>/g)).toHaveLength(datasets.length + 1);
});
