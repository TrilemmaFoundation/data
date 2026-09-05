import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { filterCopy } from "../src/content/site-copy";

async function expectNoAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

test("desktop catalog table passes automated accessibility checks", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("table")).toBeVisible();
  await expectNoAccessibilityViolations(page);
});

test("mobile catalog and filter drawer pass automated accessibility checks", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expectNoAccessibilityViolations(page);

  await page
    .getByRole("button", { name: "Open site menu" })
    .click();
  await expect(
    page.getByRole("navigation", { name: "Mobile site navigation" }),
  ).toBeVisible();
  await expectNoAccessibilityViolations(page);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: filterCopy.moreFiltersLabel, exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectNoAccessibilityViolations(page);
});

test("dataset guide passes automated accessibility checks", async ({ page }) => {
  await page.goto("/datasets/usgs-earthquakes");
  await expectNoAccessibilityViolations(page);
});

test("collection, theme, and contribute pages pass accessibility checks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const path of [
    "/collections/first-builds",
    "/themes/environment-hazards",
    "/contribute",
  ]) {
    await page.goto(path);
    await expectNoAccessibilityViolations(page);
  }
});
