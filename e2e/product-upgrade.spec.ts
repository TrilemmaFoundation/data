import { expect, test } from "@playwright/test";
import {
  catalogCopy,
  collectionsCopy,
  compareCopy,
  contributeCopy,
  datasetGuideCopy,
  shortlistCopy,
  siteCopy,
  themeLandingCopy,
} from "../src/content/site-copy";
import { FEEDBACK_URL } from "../src/lib/seo";

test("static collection and theme landings expose unique copy and catalog paths", async ({
  page,
}) => {
  await page.goto("/collections");
  await expect(page.getByRole("heading", { name: collectionsCopy.title })).toBeVisible();
  await page.getByRole("link", { name: "Start with a first microproduct" }).click();
  await expect(page).toHaveURL(/\/collections\/first-builds\/?$/);
  await expect(page.getByRole("link", { name: collectionsCopy.catalogLinkLabel })).toHaveAttribute(
    "href",
    "/",
  );

  await page.goto("/collections/regulatory-change");
  await expect(page.getByRole("link", { name: collectionsCopy.catalogLinkLabel })).toHaveAttribute(
    "href",
    /theme=Government/,
  );
  await expect(page.locator("script[type='application/ld+json']")).toHaveCount(1);

  await page.goto("/themes/environment-hazards");
  await expect(page.getByRole("heading", { name: "Environment & Hazards" })).toBeVisible();
  await expect(page.getByText(themeLandingCopy["Environment & Hazards"].outcome)).toBeVisible();
  await expect(page.getByRole("link", { name: collectionsCopy.browseThemeLabel })).toHaveAttribute(
    "href",
    /theme=Environment/,
  );
});

test("guides show trust, related datasets, facet links, and Colab", async ({ page }) => {
  await page.goto("/datasets/nws-weather-api");
  await expect(page.getByText(datasetGuideCopy.pythonSyntaxLabel)).toBeVisible();
  await expect(page.getByText(datasetGuideCopy.notebookLabel)).toBeVisible();
  await expect(page.getByRole("link", { name: datasetGuideCopy.colabLabel })).toBeVisible();
  await expect(page.getByRole("heading", { name: datasetGuideCopy.relatedTitle })).toBeVisible();
  await page.getByRole("link", { name: "Environment & Hazards" }).first().click();
  await expect(page).toHaveURL(/theme=Environment/);
});

test("shortlist persists and compare sharing uses query ids", async ({ page }) => {
  await page.goto("/datasets/nws-weather-api");
  await page.getByRole("button", { name: shortlistCopy.addLabel }).click();
  await expect(page.getByRole("region", { name: shortlistCopy.barLabel })).toBeVisible();

  await page.goto("/datasets/usgs-earthquakes");
  await page.getByRole("button", { name: shortlistCopy.addLabel }).click();
  await page.getByRole("link", { name: shortlistCopy.compareLabel }).click();
  await expect(page).toHaveURL(/\/compare/);
  await expect(page.getByRole("heading", { name: compareCopy.title })).toBeVisible();
  await expect(page.getByRole("table", { name: compareCopy.title })).toBeVisible();

  await page.goto("/compare?ids=nws-weather-api,usgs-earthquakes,cisa-known-exploited-vulnerabilities");
  await expect(page.getByRole("link", { name: "National Weather Service API" })).toBeVisible();
  await expect(page.getByRole("link", { name: "USGS Earthquake Catalog" })).toBeVisible();

  await page.evaluate(() => localStorage.clear());
  await page.goto("/compare?ids=nws-weather-api,usgs-earthquakes");
  await expect(page.getByRole("table", { name: compareCopy.title })).toBeVisible();
  await page
    .getByRole("navigation", { name: siteCopy.footerDataNavigationLabel })
    .getByRole("link", { name: siteCopy.compareLabel })
    .click();
  await expect(page).toHaveURL(/\/compare\/?$/);
  await expect(page.getByRole("heading", { name: compareCopy.emptyTitle })).toBeVisible();

  await page.goto("/compare?ids=not-a-dataset,also-fake");
  await expect(page.getByRole("heading", { name: compareCopy.invalidTitle })).toBeVisible();
});

test("contribution studio validates, previews, and downloads YAML", async ({ page }) => {
  await page.goto("/contribute");
  await expect(page.getByRole("heading", { name: contributeCopy.title })).toBeVisible();
  await expect(page.getByLabel(contributeCopy.yamlLabel)).toBeVisible();
  await page.getByLabel(contributeCopy.yamlLabel).fill("id: not valid");
  await expect(page.getByRole("alert", { name: contributeCopy.errorsLabel })).toBeVisible();

  await page.getByRole("button", { name: contributeCopy.loadExampleLabel }).click();
  const preview = page.getByRole("heading", { name: contributeCopy.previewLabel });
  await expect(preview).toBeVisible();
  await expect(page.getByRole("button", { name: shortlistCopy.addLabel })).toHaveCount(0);

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: contributeCopy.downloadLabel }).click();
  const artifact = await download;
  expect(artifact.suggestedFilename()).toMatch(/\.yaml$/);
});

test("footer feedback uses GitHub and homepage keeps catalog search", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: siteCopy.feedbackLabel })).toHaveAttribute(
    "href",
    FEEDBACK_URL,
  );
  await expect(page.getByLabel(catalogCopy.searchLabel)).toBeVisible();
});

test("pageviews do not emit custom analytics events", async ({ page }) => {
  const customEvents: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/_vercel/insights") && /event/i.test(url)) {
      customEvents.push(url);
    }
  });
  await page.goto("/");
  await page.getByLabel(catalogCopy.searchLabel).fill("weather");
  await page.goto("/datasets/nws-weather-api");
  expect(customEvents).toEqual([]);
});
