import { expect, test } from "@playwright/test";
import {
  copyButtonCopy,
  datasetGuideCopy,
} from "../src/content/site-copy";

test("a beginner can open and copy a complete dataset guide", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("table").getByRole("link").first().click();

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: datasetGuideCopy.guideTitle })).toBeVisible();
  await expect(page.getByRole("link", { name: datasetGuideCopy.officialSourceLabel }).first()).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);

  await page.getByRole("button", { name: copyButtonCopy.idleLabel }).click();
  await expect(page.getByRole("button", { name: copyButtonCopy.copiedLabel })).toBeVisible();
  await expect(page.getByText(copyButtonCopy.copiedAnnouncement)).toBeAttached();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("import ");
  expect(copied).not.toContain("python -m pip install");
  await expect(page.getByLabel(datasetGuideCopy.pythonExampleAriaLabel)).toHaveAttribute("tabindex", "0");
});

test("guide metadata preserves API terminology", async ({ page }) => {
  await page.goto("/datasets/world-development-indicators");

  await expect(
    page.getByText(datasetGuideCopy.accessTypes(["download", "api"]), {
      exact: true,
    }),
  ).toBeVisible();
});

test("repeated copies retain feedback for the latest action", async ({ page }) => {
  await page.goto("/datasets/nws-weather-api");

  await page.getByRole("button", { name: copyButtonCopy.idleLabel }).click();
  await page.waitForTimeout(1_000);
  await page.getByRole("button", { name: copyButtonCopy.copiedLabel }).click();
  await page.waitForTimeout(1_100);

  await expect(
    page.getByRole("button", { name: copyButtonCopy.copiedLabel }),
  ).toBeVisible();
});
