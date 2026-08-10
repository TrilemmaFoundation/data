import { expect, test } from "@playwright/test";

test("discovery keeps valid URL state and ignores unknown filters", async ({ page }) => {
  await page.goto("/?domain=Biology,Unknown&difficulty=novice");

  await expect(page.getByLabel("Active filters")).toContainText("Domain: Biology");
  await expect(page.getByLabel("Active filters")).not.toContainText("Unknown");
  await expect(page.getByLabel("Active filters")).not.toContainText("novice");

  await page.getByLabel("Search by topic, task, format, or provider").fill("flower");
  await expect(page).toHaveURL(/q=flower/);
  await expect(page.getByRole("link", { name: "Iris" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("1 dataset found");

  await page.getByRole("button", { name: "Beginner-friendly" }).click();
  await expect(page).toHaveURL(/difficulty=beginner/);
  await expect(page.getByRole("button", { name: "Beginner-friendly" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("button", { name: "Small CSVs" }).click();
  await expect(page).toHaveURL(/size=Tiny%2CSmall/);
  await page.goBack();
  await expect(page.getByRole("button", { name: "Beginner-friendly" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("mobile navigation overlays content and restores focus on Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Open navigation" });
  const hero = page.getByRole("heading", { name: "Find your first dataset" });
  const before = await hero.boundingBox();

  await trigger.click();
  await expect(page.getByRole("navigation", { name: "Mobile primary" })).toBeVisible();
  expect((await hero.boundingBox())?.y).toBe(before?.y);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation", { name: "Mobile primary" })).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("mobile filters restore focus and the zero state recovers", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?q=no-such-dataset-anywhere");

  await expect(page.getByRole("heading", { name: "No matching datasets" })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(
    page.getByRole("heading", { name: /^[1-9]\d* datasets$/ }),
  ).toBeVisible();

  const trigger = page.getByRole("button", { name: /^Filters/ });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(trigger).toBeFocused();
});
