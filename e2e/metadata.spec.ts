import { expect, test } from "@playwright/test";

test("public routes expose canonical and social metadata", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://data.trilemma.foundation",
  );
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
    "content",
    "Trilemma Data",
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );

  await page.goto("/graph");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://data.trilemma.foundation/graph",
  );
});

test("dataset guides expose canonical metadata and valid JSON-LD", async ({
  page,
}) => {
  await page.goto("/datasets/iris");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://data.trilemma.foundation/datasets/iris",
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Iris",
  );

  const jsonLd = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? "null",
  );
  expect(jsonLd).toMatchObject({
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Iris",
    url: "https://data.trilemma.foundation/datasets/iris",
  });
  expect(jsonLd.keywords).toEqual(
    expect.arrayContaining(["Biology", "Tabular", "Classification"]),
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
  expect(body).toContain("<loc>https://data.trilemma.foundation/graph</loc>");
  expect(body).toContain(
    "<loc>https://data.trilemma.foundation/datasets/iris</loc>",
  );
  expect(body.match(/<loc>/g)).toHaveLength(28);
});
