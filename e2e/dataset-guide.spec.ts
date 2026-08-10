import { expect, test } from "@playwright/test";

test("a beginner can open and copy a complete dataset guide", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "View guide" }).first().click();

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Datasets", exact: true }).first()).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("heading", { name: "Get started in four steps" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Official source/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Open connections/ })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);

  await page.getByRole("button", { name: "Copy" }).click();
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
  await expect(page.getByText("Python code copied to clipboard.")).toBeAttached();
  await expect(page.getByLabel("Python example")).toHaveAttribute("tabindex", "0");
});

test("guide metadata preserves API terminology", async ({ page }) => {
  await page.goto("/datasets/world-development-indicators");

  await expect(page.getByText("Download or API", { exact: true })).toBeVisible();
});
