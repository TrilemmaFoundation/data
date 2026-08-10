import { expect, test } from "@playwright/test";

test("the mobile visual map loads only after its disclosure opens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const scripts = new Set<string>();
  page.on("response", (response) => {
    if (response.url().includes("/_next/static/") && response.url().endsWith(".js")) {
      scripts.add(response.url());
    }
  });

  await page.goto("/graph");
  await page.waitForLoadState("networkidle");
  const initialScripts = new Set(scripts);
  await expect(page.locator("canvas")).toHaveCount(0);

  await page.getByText("Show visual map", { exact: true }).click();
  await expect(page.locator("canvas")).toBeVisible();
  expect([...scripts].some((url) => !initialScripts.has(url))).toBe(true);
});

test("semantic selection and the desktop graph remain available", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/graph");

  await page
    .getByRole("combobox", { name: "Focus on a dataset or concept" })
    .selectOption("task:Classification");
  await expect(page).toHaveURL(/focus=task%3AClassification/);
  await expect(page.getByRole("heading", { name: "Related dataset guides" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Iris" }).last()).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByRole("button", { name: "Fit graph to view" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset visual map" })).toBeVisible();
});
