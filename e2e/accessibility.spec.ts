import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { filterCopy, siteCopy } from "../src/content/site-copy";

async function expectNoAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

test("catalog and mobile filter drawer pass automated accessibility checks", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expectNoAccessibilityViolations(page);

  await page
    .getByRole("button", { name: siteCopy.openNavigationLabel })
    .click();
  await expect(
    page.getByRole("navigation", { name: siteCopy.mobileNavigationLabel }),
  ).toBeVisible();
  await expectNoAccessibilityViolations(page);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: filterCopy.title, exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectNoAccessibilityViolations(page);
});

test("dataset guide passes automated accessibility checks", async ({ page }) => {
  await page.goto("/datasets/usgs-earthquakes");
  await expectNoAccessibilityViolations(page);
});
