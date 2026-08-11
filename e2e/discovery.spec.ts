import { expect, test } from "@playwright/test";
import {
  catalogCopy,
  datasetCardCopy,
  datasetGuideCopy,
  filterChipPrefixes,
  filterCopy,
  notFoundCopy,
  siteCopy,
} from "../src/content/site-copy";
import { getAllDatasets } from "../src/lib/datasets";

const DATASET_COUNT = getAllDatasets().length;

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

  await page.getByRole("link", { name: "USGS Earthquake Catalog" }).click();
  await expect(page).toHaveURL(/\/datasets\/usgs-earthquakes\/?$/);
  await page.goBack();
  await expect(page.getByLabel(catalogCopy.searchLabel)).toHaveValue("earthquake");
});

test("search preserves typed spaces and finds dataset formats", async ({ page }) => {
  await page.goto("/");
  const search = page.getByLabel(catalogCopy.searchLabel);

  await search.pressSequentially("world development");
  await expect(search).toHaveValue("world development");

  await search.fill("GeoTIFF");
  await expect(page.getByRole("link", { name: "Natural Earth" })).toBeVisible();

  await page.goto("/?q=wildfire");
  await expect(page.getByRole("link", { name: "NASA FIRMS Active Fire Data" })).toBeVisible();
  await page.goto("/?q=company+filings");
  await expect(
    page.getByRole("link", { name: "SEC EDGAR Submissions and Company Facts" }),
  ).toBeVisible();
});

test("the hero has one CTA that focuses the catalog without changing URL state", async ({
  page,
}) => {
  await page.goto("/?q=earthquake");
  const startingUrl = page.url();
  const hero = page.getByRole("region", { name: catalogCopy.heroTitle });
  const cta = hero.getByRole("button", {
    name: catalogCopy.browseDatasets(DATASET_COUNT),
  });

  await expect(hero.locator("button, a, input, select, textarea")).toHaveCount(1);
  await page
    .getByRole("navigation", { name: siteCopy.primaryNavigationLabel })
    .getByRole("link", { name: siteCopy.contributeLabel })
    .focus();
  await page.keyboard.press("Tab");
  await expect(cta).toBeFocused();
  expect(await cta.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(startingUrl);
  await expect(page.getByRole("heading", { name: catalogCopy.resultCount(1) })).toBeFocused();
});

test("the catalog jump honors reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior))
    .toBe("auto");
  await page
    .getByRole("button", { name: catalogCopy.browseDatasets(DATASET_COUNT) })
    .click();
  await expect(
    page.getByRole("heading", { name: catalogCopy.resultCount(DATASET_COUNT) }),
  ).toBeFocused();
});

test("the recommended dataset leads the unfiltered catalog only", async ({ page }) => {
  await page.goto("/");
  const firstCard = page.locator('[data-slot="card"]').first();
  await expect(firstCard).toContainText("National Weather Service API");
  await expect(firstCard).toContainText(datasetCardCopy.goodFirstBuildLabel);

  await page.goto("/?q=weather");
  await expect(page.getByRole("link", { name: "National Weather Service API" })).toBeVisible();
  await expect(page.getByText(datasetCardCopy.goodFirstBuildLabel)).toHaveCount(0);
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
    const heroTitle = page.getByRole("heading", { name: catalogCopy.heroTitle });
    await expect(heroTitle).toBeVisible();
    await expect(
      page.getByRole("button", { name: catalogCopy.browseDatasets(DATASET_COUNT) }),
    ).toBeVisible();
    if (width >= 1024) {
      await expect(heroTitle).toHaveCSS("white-space", "nowrap");
    }

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
      expect((await page.locator("#results-title").boundingBox())?.y).toBeLessThan(700);
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

test("every dataset guide reflows on a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });

  for (const dataset of getAllDatasets()) {
    await page.goto(`/datasets/${dataset.id}`);
    await expect(
      page.getByRole("heading", { level: 1, name: dataset.name }),
    ).toBeVisible();

    const widths = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(widths.scroll, `${dataset.id} should not scroll horizontally`).toBe(
      widths.client,
    );
  }
});

test("the global not-found page offers route-neutral recovery", async ({ page }) => {
  await page.goto("/missing-page");

  await expect(
    page.getByRole("heading", { level: 1, name: notFoundCopy.title }),
  ).toBeVisible();
  await expect(page.getByText(notFoundCopy.description)).toBeVisible();
  await expect(
    page.getByRole("link", { name: notFoundCopy.backLabel }),
  ).toHaveAttribute("href", "/");
});
