import { expect, test } from "@playwright/test";
import {
  catalogCopy,
  datasetGuideCopy,
  filterChipPrefixes,
  filterCopy,
  siteCopy,
} from "../src/content/site-copy";

test("discovery keeps valid URL state and ignores unknown filters", async ({ page }) => {
  await page.goto("/?domain=Natural%20Hazards,Unknown&difficulty=novice");

  await expect(page.getByLabel(catalogCopy.activeFiltersAriaLabel)).toContainText(
    `${filterChipPrefixes.domains}: Natural Hazards`,
  );
  await expect(page.getByLabel(catalogCopy.activeFiltersAriaLabel)).not.toContainText("Unknown");
  await expect(page.getByLabel(catalogCopy.activeFiltersAriaLabel)).not.toContainText("novice");

  await page.getByLabel(catalogCopy.searchLabel).fill("earthquake");
  await expect(page).toHaveURL(/q=earthquake/);
  await expect(page.getByRole("link", { name: "USGS Earthquake Catalog" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText(catalogCopy.resultStatus(1));

  const wildfireIdea = catalogCopy.productIdeas.find((idea) => idea.id === "wildfire")!;
  await page.getByRole("button", { name: wildfireIdea.label }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe(wildfireIdea.query);
  await expect(page.getByRole("button", { name: wildfireIdea.label })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("link", { name: "NASA FIRMS Active Fire Data" })).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel(catalogCopy.searchLabel)).toHaveValue("earthquake");
  await page.goForward();
  await expect(page.getByLabel(catalogCopy.searchLabel)).toHaveValue(wildfireIdea.query);
});

test("search preserves typed spaces and finds dataset formats", async ({ page }) => {
  await page.goto("/");
  const search = page.getByLabel(catalogCopy.searchLabel);

  await search.pressSequentially("world development");
  await expect(search).toHaveValue("world development");

  await search.fill("GeoTIFF");
  await expect(page.getByRole("link", { name: "Natural Earth" })).toBeVisible();
});

test("product ideas filter real datasets and the featured starter opens its guide", async ({
  page,
}) => {
  const expectedResults: Record<string, string[]> = {
    wildfire: ["NASA FIRMS Active Fire Data"],
    filings: ["SEC EDGAR Submissions and Company Facts"],
    markets: ["Polymarket Public Market Data", "Kalshi Public Market Data"],
    "market-sizing": ["American Community Survey 5-Year Estimates"],
    electricity: ["EIA Hourly Electric Grid Data"],
  };

  for (const idea of catalogCopy.productIdeas) {
    await page.goto("/");
    await page.getByRole("button", { name: idea.label }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe(idea.query);
    await expect(page.getByRole("button", { name: idea.label })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    for (const datasetName of expectedResults[idea.id]!) {
      await expect(page.getByRole("link", { name: datasetName })).toBeVisible();
    }
    await expect(
      page.getByRole("link", {
        name: catalogCopy.resultsLink(expectedResults[idea.id]!.length),
      }),
    ).toHaveAttribute("href", "#results-title");
  }

  await page.goto("/");
  await page.getByRole("link", { name: catalogCopy.featuredStarter.ctaLabel }).click();
  await expect(page).toHaveURL(/\/datasets\/nws-weather-api\/?$/);
});

test("product ideas support visible keyboard focus and activation", async ({ page }) => {
  await page.goto("/");
  const idea = catalogCopy.productIdeas[0]!;
  const search = page.getByLabel(catalogCopy.searchLabel);

  await search.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");

  const button = page.getByRole("button", { name: idea.label });
  await expect(button).toBeFocused();
  expect(await button.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe("none");

  await page.keyboard.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe(idea.query);
  await expect(button).toHaveAttribute("aria-pressed", "true");
});

test("long active filters do not create mobile horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const query = "x".repeat(200);
  await page.goto(`/?q=${query}`);
  await expect(
    page.getByLabel(
      catalogCopy.removeFilter(`${filterChipPrefixes.query}: ${query}`),
    ),
  ).toBeVisible();

  const widths = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(widths.scroll).toBe(widths.client);
});

test("mobile navigation overlays content and restores focus on Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const trigger = page.getByRole("button", { name: siteCopy.openNavigationLabel });
  const hero = page.getByRole("heading", { name: catalogCopy.heroTitle });
  const before = await hero.boundingBox();

  await trigger.click();
  await expect(
    page.getByRole("navigation", { name: siteCopy.mobileNavigationLabel }),
  ).toBeVisible();
  expect((await hero.boundingBox())?.y).toBe(before?.y);

  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("navigation", { name: siteCopy.mobileNavigationLabel }),
  ).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("mobile filters restore focus and the zero state recovers", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?q=no-such-dataset-anywhere");

  await expect(page.getByRole("heading", { name: catalogCopy.emptyTitle })).toBeVisible();
  await page.getByRole("button", { name: catalogCopy.clearFiltersLabel }).click();
  await expect(page.locator('[data-slot="card"]').first()).toBeVisible();

  const trigger = page.getByRole("button", { name: filterCopy.title, exact: true });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.getByRole("button", { name: catalogCopy.closeFiltersLabel }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.getByRole("dialog").getByRole("button").last().click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("mobile filter drawer closes at the desktop breakpoint", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/");

  await page.getByRole("button", { name: filterCopy.title, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: catalogCopy.drawerTitle });
  await expect(dialog).toBeVisible();

  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(
    page.getByRole("complementary", { name: filterCopy.title, exact: true }),
  ).toBeVisible();
  await expect(dialog).toBeHidden();
});

test("application copy reflows across supported viewport widths", async ({ page }) => {
  for (const width of [360, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: catalogCopy.heroTitle })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: catalogCopy.featuredStarter.title }),
    ).toBeVisible();

    const cards = page.locator('[data-slot="card"]');
    await expect(cards.first()).toBeVisible();
    if (width >= 768) {
      const [first, second] = await Promise.all([
        cards.nth(0).boundingBox(),
        cards.nth(1).boundingBox(),
      ]);
      expect(first?.y).toBe(second?.y);
      expect(first?.height).toBe(second?.height);
    }
    if (width === 1440) {
      expect((await page.locator("#results-title").boundingBox())?.y).toBeLessThan(900);
      expect((await cards.first().boundingBox())?.y).toBeLessThan(900);
    }

    let documentWidth = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(documentWidth.scroll).toBe(documentWidth.client);

    await page.goto("/datasets/nasa-firms");
    await expect(
      page.getByRole("heading", { name: datasetGuideCopy.guideTitle }),
    ).toBeVisible();
    documentWidth = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(documentWidth.scroll).toBe(documentWidth.client);
  }
});
