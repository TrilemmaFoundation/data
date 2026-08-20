import { expect, test } from "@playwright/test";
import {
  catalogCopy,
  collectionsCopy,
  contributeCopy,
  datasetGuideCopy,
  siteCopy,
  themeLandingCopy,
} from "../src/content/site-copy";
import { stringifyContributionYaml } from "../src/lib/contribution";
import { loadContributionTemplate } from "../src/lib/contribution-template";
import { getDatasetById } from "../src/lib/datasets";
import { FEEDBACK_URL } from "../src/lib/seo";

test("collection and theme landings expose unique copy and catalog paths", async ({
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

test("contribution studio validates, previews, and downloads YAML", async ({ page }) => {
  const template = loadContributionTemplate();
  const validYaml = stringifyContributionYaml(getDatasetById("nws-weather-api")!);

  await page.goto("/contribute");
  const editor = page.getByLabel(contributeCopy.yamlLabel);
  await expect(page.getByRole("heading", { name: contributeCopy.title })).toBeVisible();
  await expect(editor).toHaveValue(template);
  await expect(page.getByText(contributeCopy.emptyPreview)).toBeVisible();

  await editor.fill("id: not valid");
  await expect(page.getByRole("alert", { name: contributeCopy.errorsLabel })).toBeVisible();

  await page.getByRole("button", { name: contributeCopy.loadExampleLabel }).click();
  await expect(editor).toHaveValue(template);
  await expect(page.getByText(contributeCopy.emptyPreview)).toBeVisible();

  await editor.fill(validYaml);
  await expect(page.getByRole("heading", { name: "National Weather Service API" })).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: contributeCopy.downloadLabel }).click();
  const artifact = await download;
  expect(artifact.suggestedFilename()).toBe("nws-weather-api.yaml");
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
