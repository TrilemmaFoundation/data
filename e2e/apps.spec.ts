import { existsSync, readdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const appNames = [
  ["titanskies", "TitanSkies"],
  ["hyperoptions", "HyperOptions"],
  ["travelcanary", "TravelCanary"],
  ["househunter", "HouseHunter"],
  ["rockyroad", "RockyRoad"],
  ["stackingsats", "StackingSats"],
] as const;

test("the seven Apps routes are exported and show the right project", async ({ page, request }) => {
  expect(existsSync("out/apps.html")).toBe(true);
  const listing = await request.get("/apps");
  expect(listing.ok()).toBe(true);
  expect(readdirSync("out/apps").filter((file) => file.endsWith(".html")).sort()).toEqual(
    appNames.map(([slug]) => `${slug}.html`).sort(),
  );
  expect((await request.get("/apps/not-a-project")).status()).toBe(404);
  await page.goto("/apps");
  await expect(page.getByRole("heading", { level: 1, name: "Apps" })).toBeVisible();
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(6);
  for (const [index, [slug, title]] of appNames.entries()) {
    await expect(cards.nth(index).getByRole("heading", { level: 2, name: title })).toBeVisible();
    await expect(cards.nth(index).getByRole("link", { name: title, exact: true })).toHaveAttribute("href", `/apps/${slug}`);
  }
  for (const [slug, title] of appNames) {
    expect(existsSync(`out/apps/${slug}.html`), slug).toBe(true);
    const response = await request.get(`/apps/${slug}`);
    expect(response.ok(), slug).toBe(true);
    await page.goto(`/apps/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Data navigation" }).getByRole("link", { name: "Apps", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { level: 2, name: "Data Sources" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Apps", exact: true }).last()).toHaveAttribute("href", "/apps");
    await expect(page.getByRole("link", { name: /Official Source/ }).first()).toBeVisible();
    await expect(page.getByText("Role:", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Availability:", { exact: true }).first()).toBeVisible();
    const guidePaths = await page.locator('main a[href^="/datasets/"]').evaluateAll((links) =>
      [...new Set(links.map((link) => link.getAttribute("href")).filter((href): href is string => Boolean(href)))],
    );
    for (const path of guidePaths) expect((await request.get(path)).ok(), `${slug}: ${path}`).toBe(true);
  }
});

test("Apps is a primary header destination on listing and details", async ({ page }) => {
  for (const path of ["/apps", "/apps/travelcanary", "/apps/stackingsats/"]) {
    await page.goto(path);
    const nav = page.getByRole("navigation", { name: "Data navigation" });
    await expect(nav.locator("a")).toHaveText(["Data", "Datasets", "Apps", "Build Paths", "Contribute"]);
    await expect(nav.getByRole("link", { name: "Apps", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Datasets", exact: true })).not.toHaveAttribute("aria-current");
  }
});

test("all six app cards fit in the desktop viewport at 100% zoom", async ({ page }) => {
  for (const { width, height } of [{ width: 1280, height: 720 }, { width: 1470, height: 776 }]) {
    await page.setViewportSize({ width, height });
    await page.goto("/apps");
    const cards = page.getByRole("article");
    await expect(cards).toHaveCount(6);
    const lastCardBottom = await cards.last().evaluate((card) => card.getBoundingClientRect().bottom);
    expect(lastCardBottom).toBeLessThanOrEqual(height);
    await expect(cards.last().getByRole("link", { name: /Source Code/ })).toBeInViewport();
  }
});

test("cards and details expose only the intended external actions", async ({ page }) => {
  await page.goto("/apps");
  const cards = page.getByRole("article");
  const expected = [
    ["Live App", "https://www.titanskies.com/", "https://github.com/hypertrial/titanskies"],
    [undefined, undefined, "https://github.com/hypertrial/hyperoptions"],
    ["Live App", "https://travelcanary.org/", "https://github.com/hypertrial/travelcanary"],
    [undefined, undefined, "https://github.com/hypertrial/househunter"],
    [undefined, undefined, "https://github.com/hypertrial/rockyroad"],
    ["Archive", "https://stackingsats.org/", "https://github.com/hypertrial/stacksats"],
  ] as const;
  const statuses = [undefined, undefined, "Beta", "Alpha", "Alpha", "Archived"] as const;
  for (const [index, [action, destination, source]] of expected.entries()) {
    const card = cards.nth(index);
    const status = statuses[index];
    if (status) await expect(card.getByText(status, { exact: true })).toBeVisible();
    else await expect(card.getByText(/^(Alpha|Beta|Archived)$/)).toHaveCount(0);
    const links = card.locator('a[target="_blank"]');
    await expect(links).toHaveCount(action ? 2 : 1);
    if (action) await expect(links.first()).toHaveAttribute("href", destination!);
    await expect(links.last()).toHaveAttribute("href", source);
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute("rel", /noopener.*noreferrer/);
      await expect(link).toHaveAccessibleName(/opens in a new tab/);
    }
  }
  await expect(page.getByText("Paid Target")).toHaveCount(0);
  await cards.first().getByRole("link", { name: "TitanSkies", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(cards.first().getByRole("link", { name: /Explore App/ })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(cards.first().getByRole("link", { name: /Live App/ })).toBeFocused();

  await page.goto("/apps/stackingsats");
  await expect(page.getByRole("link", { name: /Archive/ })).toHaveAttribute("href", "https://stackingsats.org/");
  await expect(page.getByRole("link", { name: /Explore BRK Data/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Live App/ })).toHaveCount(0);
  await expect(page.getByText(/historical|archiv/i).first()).toBeVisible();
  const brk = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Bitcoin Research Kit merged metrics" }) });
  await expect(brk.getByRole("link", { name: /Related Dataset Guide/ })).toHaveAttribute("href", "/datasets/bitview-bitcoin-series");
  await expect(brk.getByRole("link", { name: /Hosted BRK data \(Bitview\)/ })).toHaveAttribute("href", "https://bitview.space/");
  await expect(brk).toContainText("not this pinned historical parquet artifact");
});

test("source links distinguish matching guides from official sources", async ({ page }) => {
  await page.goto("/apps/travelcanary");
  const earthquake = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "USGS earthquake feeds" }) });
  await expect(earthquake.getByRole("link", { name: /Dataset Guide/ })).toHaveAttribute("href", "/datasets/usgs-earthquakes");
  await expect(earthquake.getByRole("link", { name: /Official Source/ })).toHaveAttribute("href", "https://earthquake.usgs.gov/");
  await expect(earthquake.getByRole("link", { name: /Official Source/ })).toHaveAttribute("target", "_blank");
  await expect(earthquake.getByRole("link", { name: /Official Source/ })).toHaveAccessibleName(/opens in a new tab/);
  await expect(page.getByText(/reviewed source inventory, not a live feed-health report/i)).toBeVisible();

  await page.goto("/apps/househunter");
  const nri = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "FEMA National Risk Index" }) });
  await expect(nri.getByRole("link", { name: /Dataset Guide/ })).toHaveCount(0);
  await expect(nri).toContainText("FEMA National Flood Hazard Layer is a different dataset");
});

test("Bitview is discoverable as a dataset guide with a runnable notebook", async ({ page }) => {
  await page.goto("/?q=Bitview");
  await expect(page.getByRole("link", { name: "Bitview Bitcoin Series" })).toBeVisible();
  await page.getByRole("link", { name: "Bitview Bitcoin Series" }).click();
  await expect(page).toHaveURL(/\/datasets\/bitview-bitcoin-series\/?$/);
  await expect(page.getByRole("heading", { level: 1, name: "Bitview Bitcoin Series" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open in Colab/ })).toHaveAttribute("href", /bitview-bitcoin-series\.ipynb/);
});
