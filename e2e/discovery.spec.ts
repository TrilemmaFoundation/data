import { expect, test } from "@playwright/test";
import {
  catalogCopy,
  datasetCardCopy,
  datasetGuideCopy,
  filterChipPrefixes,
  filterCopy,
  notFoundCopy,
  siteCopy,
  tableCopy,
} from "../src/content/site-copy";
import { getAllDatasets } from "../src/lib/datasets";
import { CATALOG_PAGE_SIZE } from "../src/lib/search";
import {
  CONTRIBUTE_URL,
  FOUNDATION_CHARTER_URL,
  FOUNDATION_PRIVACY_URL,
  FOUNDATION_PROJECTS_URL,
  FOUNDATION_TEAM_URL,
  FOUNDATION_TERMS_URL,
  FOUNDATION_TOURNAMENTS_URL,
  FOUNDATION_URL,
} from "../src/lib/seo";

const DATASET_COUNT = getAllDatasets().length;
const CATALOG_PAGES = Math.ceil(DATASET_COUNT / CATALOG_PAGE_SIZE);
const LAST_PAGE_ITEMS = DATASET_COUNT % CATALOG_PAGE_SIZE || CATALOG_PAGE_SIZE;

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
  await expect(
    page.getByRole("button", { name: filterCopy.moreFiltersLabel, exact: true }),
  ).toBeVisible();

  await page.goto("/?q=wildfire");
  await expect(page.getByRole("link", { name: "NASA FIRMS Active Fire Data" })).toBeVisible();
  await page.goto("/?q=company+filings");
  await expect(
    page.getByRole("link", { name: "SEC EDGAR Submissions and Company Facts" }),
  ).toBeVisible();
});

test("rapid controls preserve filters selected during pending URL navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");

  await page.locator("#desktop-dataset-theme").selectOption("Technology & Cybersecurity");
  await page.locator("#desktop-dataset-difficulty").selectOption("beginner");
  await page.getByLabel(catalogCopy.searchLabel).fill("vulnerability");

  await expect(page).toHaveURL((url) =>
    url.searchParams.get("q") === "vulnerability" &&
    url.searchParams.get("theme") === "Technology & Cybersecurity" &&
    url.searchParams.get("difficulty") === "beginner",
  );
  await expect(
    page.getByRole("link", { name: "CISA Known Exploited Vulnerabilities Catalog" }),
  ).toBeVisible();
});

test("the hero title leads into the catalog without a jump CTA", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const hero = page.getByRole("region", { name: catalogCopy.heroTitle });
  await expect(hero.getByRole("heading", { name: catalogCopy.heroTitle })).toBeVisible();
  await expect(hero.locator("button, a, input, select, textarea")).toHaveCount(0);

  const table = page.getByRole("table", { name: tableCopy.caption });
  const headerRow = table.getByRole("row").nth(0);
  const firstRow = table.getByRole("row").nth(1);
  const lastRow = table.getByRole("row").nth(CATALOG_PAGE_SIZE);
  const pagination = page.getByRole("navigation", { name: catalogCopy.paginationLabel });
  const headerBounds = await headerRow.boundingBox();
  const firstBounds = await firstRow.boundingBox();
  const lastBounds = await lastRow.boundingBox();
  const paginationBounds = await pagination.boundingBox();
  expect(firstBounds?.y).toBeLessThan(280);
  expect(firstBounds?.height ?? 0).toBeGreaterThan(headerBounds?.height ?? Number.POSITIVE_INFINITY);
  expect(firstBounds?.height ?? 0).toBeGreaterThan(paginationBounds?.height ?? Number.POSITIVE_INFINITY);
  expect(firstBounds ? firstBounds.y + firstBounds.height : Number.POSITIVE_INFINITY).toBeLessThan(900);
  expect(lastBounds ? lastBounds.y + lastBounds.height : Number.POSITIVE_INFINITY).toBeLessThan(900);
  expect(
    paginationBounds
      ? paginationBounds.y + paginationBounds.height
      : Number.POSITIVE_INFINITY,
  ).toBeLessThan(900);

  await page.setViewportSize({ width: 1280, height: 800 });
  const laptopLast = await lastRow.boundingBox();
  expect(laptopLast ? laptopLast.y + laptopLast.height : Number.POSITIVE_INFINITY).toBeLessThan(800);
});

test("the recommended dataset leads the unfiltered catalog only", async ({ page }) => {
  await page.goto("/");
  const firstRow = page.getByRole("table", { name: tableCopy.caption }).getByRole("row").nth(1);
  await expect(firstRow).toContainText("National Weather Service API");
  await expect(firstRow).toContainText(datasetCardCopy.goodFirstBuildLabel);

  await page.goto("/?q=weather");
  await expect(page.getByRole("link", { name: "National Weather Service API" })).toBeVisible();
  await expect(page.getByText(datasetCardCopy.goodFirstBuildLabel)).toHaveCount(0);
});

test("catalog pagination keeps global order and canonical URL state", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const table = page.getByRole("table", { name: tableCopy.caption });
  const pagination = page.getByRole("navigation", { name: catalogCopy.paginationLabel });

  await expect(table.getByRole("row")).toHaveCount(CATALOG_PAGE_SIZE + 1);
  await expect(pagination.getByRole("button", { name: catalogCopy.previousPageLabel })).toBeDisabled();
  await expect(pagination.getByRole("button", { name: catalogCopy.pageLabel(1), exact: true })).toHaveAttribute("aria-current", "page");

  await pagination.getByRole("button", { name: catalogCopy.pageLabel(CATALOG_PAGES) }).click();
  await expect(page).toHaveURL(new RegExp(`page=${CATALOG_PAGES}`));
  await expect(table.getByRole("row")).toHaveCount(LAST_PAGE_ITEMS + 1);
  await expect(pagination).toContainText(
    catalogCopy.pageStatus(
      CATALOG_PAGES,
      CATALOG_PAGES,
      DATASET_COUNT - LAST_PAGE_ITEMS + 1,
      DATASET_COUNT,
      DATASET_COUNT,
    ),
  );

  await page.reload();
  await expect(pagination.getByRole("button", { name: catalogCopy.pageLabel(CATALOG_PAGES) })).toHaveAttribute("aria-current", "page");
  await page.goBack();
  await expect(page).not.toHaveURL(/page=/);
  await expect(table.getByRole("row")).toHaveCount(CATALOG_PAGE_SIZE + 1);

  await page.goto("/?page=999");
  await expect(page).toHaveURL(new RegExp(`page=${CATALOG_PAGES}`));
  await page.goto("/?page=invalid");
  await expect(page).not.toHaveURL(/page=/);
});

test("pagination previous and next stay put when the page list changes", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const pagination = page.getByRole("navigation", { name: catalogCopy.paginationLabel });
  const previous = pagination.getByRole("button", { name: catalogCopy.previousPageLabel });
  const next = pagination.getByRole("button", { name: catalogCopy.nextPageLabel });
  const before = {
    previous: await previous.boundingBox(),
    next: await next.boundingBox(),
  };

  await pagination.getByRole("button", { name: catalogCopy.pageLabel(2) }).click();
  const after = {
    previous: await previous.boundingBox(),
    next: await next.boundingBox(),
  };

  expect(after.previous?.x).toBeCloseTo(before.previous?.x ?? Number.NaN, 0);
  expect(after.next?.x).toBeCloseTo(before.next?.x ?? Number.NaN, 0);
});

test("pagination next and previous keep the window scroll position", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.locator("footer").scrollIntoViewIfNeeded();
  const pagination = page.getByRole("navigation", { name: catalogCopy.paginationLabel });
  const before = await page.evaluate(() => window.scrollY);
  expect(before).toBeGreaterThan(0);

  await pagination.getByRole("button", { name: catalogCopy.nextPageLabel }).click();
  await expect(page).toHaveURL(/page=2/);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);

  await pagination.getByRole("button", { name: catalogCopy.previousPageLabel }).click();
  await expect(page).not.toHaveURL(/page=/);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
});

test("deep catalog links show page context and a result above the fold", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const pageNumber = Math.min(4, CATALOG_PAGES);
  const start = (pageNumber - 1) * CATALOG_PAGE_SIZE + 1;
  const end = Math.min(pageNumber * CATALOG_PAGE_SIZE, DATASET_COUNT);
  await page.goto(`/?page=${pageNumber}`);

  await expect(
    page.getByText(catalogCopy.pageSummary(pageNumber, CATALOG_PAGES, start, end)),
  ).toBeVisible();
  const firstResult = page
    .getByRole("table", { name: tableCopy.caption })
    .getByRole("row")
    .nth(1);
  const bounds = await firstResult.boundingBox();
  expect(bounds?.y).toBeLessThan(800);
  expect(
    bounds ? bounds.y + bounds.height : Number.POSITIVE_INFINITY,
  ).toBeLessThan(800);
});

test("pagination resets for catalog changes and restores through guide history", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?page=2");
  await expect(page.locator('[data-slot="card"]')).toHaveCount(CATALOG_PAGE_SIZE);

  await page.getByLabel(catalogCopy.searchLabel).fill("legislation");
  await expect(page).not.toHaveURL(/page=/);
  await expect(page.getByRole("link", { name: "Congress.gov Legislation API" }).first()).toBeVisible();

  await page.goto("/?page=2");
  const guide = page.locator('[data-slot="card"] a').first();
  const guideName = await guide.innerText();
  await guide.click();
  await expect(page.getByRole("heading", { level: 1, name: guideName })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator('[data-slot="card"]')).toHaveCount(CATALOG_PAGE_SIZE);
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

  const trigger = page.locator('button[aria-controls="mobile-navigation"]');
  const hero = page.getByRole("heading", { name: catalogCopy.heroTitle });
  const before = await hero.boundingBox();

  await trigger.click();
  await expect(
    page.getByRole("navigation", { name: siteCopy.mobileNavigationLabel }),
  ).toBeVisible();
  expect((await hero.boundingBox())?.y).toBe(before?.y);
  const firstLink = page
    .getByRole("navigation", { name: siteCopy.mobileNavigationLabel })
    .getByRole("link", { name: siteCopy.contributeLabel });
  await expect(firstLink).toBeFocused();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");

  await page.keyboard.press("Shift+Tab");
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page
      .getByRole("navigation", { name: siteCopy.mobileNavigationLabel })
      .getByRole("link", { name: siteCopy.contributeLabel }),
  ).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("navigation", { name: siteCopy.mobileNavigationLabel }),
  ).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});

test("mobile navigation closes from its backdrop and on route changes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.goto("/datasets/nws-weather-api/");

  const trigger = page.getByRole("button", {
    name: siteCopy.openNavigationLabel,
  });
  const navigation = page.getByRole("navigation", {
    name: siteCopy.mobileNavigationLabel,
  });

  await trigger.click();
  await page.locator("[data-mobile-menu-backdrop]").click({ position: { x: 5, y: 300 } });
  await expect(navigation).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.goBack();
  await expect(page).toHaveURL((url) => url.pathname === "/");
  await expect(navigation).toBeHidden();
  await page.goForward();
  await expect(page).toHaveURL(/\/datasets\/nws-weather-api\/?$/);
  await expect(navigation).toBeHidden();
});

test("header and footer expose the product and Foundation destinations", async ({
  page,
}) => {
  await page.goto("/");

  const primary = page.getByRole("navigation", {
    name: siteCopy.primaryNavigationLabel,
  });
  await expect(
    primary.getByRole("link", { name: siteCopy.datasetsNavigationLabel }),
  ).toHaveCount(0);
  await expect(
    primary.getByRole("link", { name: siteCopy.contributeLabel }),
  ).toHaveAttribute("href", CONTRIBUTE_URL);
  await expect(
    primary.getByRole("link", { name: siteCopy.contributeLabel }),
  ).toHaveAttribute("target", "_blank");
  await expect(
    page.getByRole("link", { name: siteCopy.productLabel, exact: true }),
  ).toHaveCount(0);

  const dataLinks = page.getByRole("navigation", {
    name: siteCopy.footerDataNavigationLabel,
  });
  await expect(
    dataLinks.getByRole("link", { name: siteCopy.datasetsNavigationLabel }),
  ).toHaveAttribute("href", "/");
  await expect(
    dataLinks.getByRole("link", { name: siteCopy.contributeLabel }),
  ).toHaveAttribute("href", CONTRIBUTE_URL);

  const foundationLinks = page.getByRole("navigation", {
    name: siteCopy.footerFoundationNavigationLabel,
  });
  for (const [name, href] of [
    [siteCopy.foundationHomeLabel, FOUNDATION_URL],
    [siteCopy.projectsLabel, FOUNDATION_PROJECTS_URL],
    [siteCopy.tournamentsLabel, FOUNDATION_TOURNAMENTS_URL],
    [siteCopy.teamLabel, FOUNDATION_TEAM_URL],
  ] as const) {
    await expect(foundationLinks.getByRole("link", { name })).toHaveAttribute(
      "href",
      href,
    );
  }

  const legalLinks = page.getByRole("navigation", {
    name: siteCopy.footerLegalNavigationLabel,
  });
  for (const [name, href] of [
    [siteCopy.charterLabel, FOUNDATION_CHARTER_URL],
    [siteCopy.privacyLabel, FOUNDATION_PRIVACY_URL],
    [siteCopy.termsLabel, FOUNDATION_TERMS_URL],
  ] as const) {
    await expect(legalLinks.getByRole("link", { name })).toHaveAttribute(
      "href",
      href,
    );
  }
});

test("mobile navigation stays closed after crossing the desktop breakpoint", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: siteCopy.openNavigationLabel }).click();
  const navigation = page.getByRole("navigation", {
    name: siteCopy.mobileNavigationLabel,
  });
  await expect(navigation).toBeVisible();

  await page.setViewportSize({ width: 768, height: 900 });
  await expect(navigation).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(navigation).toBeHidden();
});

test("whitespace-only shared queries remain unfiltered", async ({ page }) => {
  await page.goto("/?q=+++");

  await expect(
    page.getByRole("table", { name: tableCopy.caption }).getByText(datasetCardCopy.goodFirstBuildLabel),
  ).toBeVisible();
  await expect(page.getByLabel(catalogCopy.activeFiltersAriaLabel)).toHaveCount(0);
});

test("mobile filters restore focus and the zero state recovers", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?q=no-such-dataset-anywhere");

  await expect(page.getByRole("heading", { name: catalogCopy.emptyTitle })).toBeVisible();
  await page.getByRole("button", { name: catalogCopy.clearFiltersLabel }).click();
  await expect(page.locator('[data-slot="card"]').first()).toBeVisible();

  const trigger = page.getByRole("button", { name: filterCopy.moreFiltersLabel, exact: true });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
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

test("catalog uses a desktop table and mobile cards at the lg breakpoint", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("table", { name: tableCopy.caption })).toBeVisible();
  await expect(page.locator('[data-slot="card"]').first()).toBeHidden();

  await page.setViewportSize({ width: 768, height: 900 });
  await expect(page.getByRole("table", { name: tableCopy.caption })).toBeHidden();
  await expect(page.locator('[data-slot="card"]').first()).toBeVisible();
});

test("catalog search stays wide enough to read and cards use a single guide link", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto("/");
  const search = page.getByLabel(catalogCopy.searchLabel);
  expect((await search.boundingBox())?.width ?? 0).toBeGreaterThan(250);
  await expect(page.locator('[data-slot="card"]').first().locator("a")).toHaveCount(1);

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/");
  expect((await search.boundingBox())?.width ?? 0).toBeGreaterThan(280);
  await expect(page.locator("#desktop-dataset-theme")).toBeVisible();
  await expect(page.locator("#desktop-dataset-access")).toBeHidden();
  await page.getByRole("button", { name: filterCopy.moreFiltersLabel, exact: true }).click();
  await expect(page.locator("#drawer-dataset-access")).toBeVisible();
  await expect(page.locator("#drawer-dataset-api-key")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("link", { name: "National Weather Service API", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("table", { name: tableCopy.caption })
      .getByRole("row")
      .nth(1)
      .getByText("National Weather Service", { exact: true }),
  ).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator("#desktop-dataset-access")).toBeVisible();
  await expect(page.locator("#desktop-dataset-api-key")).toBeVisible();
});

test("the sticky table header meets the site header without exposing rows", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");

  const table = page.getByRole("table", { name: tableCopy.caption });
  await page.locator("footer").scrollIntoViewIfNeeded();

  const siteHeader = await page.locator("header").first().boundingBox();
  const tableHeader = await table.getByRole("columnheader").first().boundingBox();
  expect(siteHeader).not.toBeNull();
  expect(tableHeader).not.toBeNull();
  expect(tableHeader!.y).toBeCloseTo(siteHeader!.y + siteHeader!.height, 0);
});

test("desktop quick facets filter by theme, access, difficulty, and API key", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");

  await page.locator("#desktop-dataset-theme").selectOption("Technology & Cybersecurity");
  await expect(page).toHaveURL((url) => url.searchParams.get("theme") === "Technology & Cybersecurity");
  await expect(page.getByRole("link", { name: "CISA Known Exploited Vulnerabilities Catalog" })).toBeVisible();

  await page.locator("#desktop-dataset-access").selectOption("api");
  await page.locator("#desktop-dataset-api-key").selectOption("true");
  await expect(page.getByRole("heading", { name: catalogCopy.emptyTitle })).toBeVisible();
  await page.locator("#desktop-dataset-access").selectOption("download");
  await page.locator("#desktop-dataset-difficulty").selectOption("beginner");
  await page.locator("#desktop-dataset-api-key").selectOption("false");
  await expect(page.getByRole("link", { name: "CISA Known Exploited Vulnerabilities Catalog" })).toBeVisible();
});

test("desktop sorting is shareable, reversible, and restores the promoted order", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const table = page.getByRole("table", { name: tableCopy.caption });
  const firstDataRow = () => table.getByRole("row").nth(1);
  await expect(firstDataRow()).toContainText("National Weather Service API");

  await page.getByRole("button", { name: "Sort Dataset ascending" }).click();
  await expect(page).toHaveURL((url) =>
    url.searchParams.get("sort") === "name" && url.searchParams.get("order") === "asc",
  );
  await expect(firstDataRow()).toContainText("American Community Survey 5-Year Estimates");

  await page.getByRole("button", { name: "Sort Dataset descending" }).click();
  await expect(page).toHaveURL((url) => url.searchParams.get("order") === "desc");
  await expect(firstDataRow()).not.toContainText("American Community Survey 5-Year Estimates");

  await page.getByRole("button", { name: "Restore default order" }).click();
  await expect(page).toHaveURL((url) => !url.searchParams.has("sort"));
  await expect(firstDataRow()).toContainText("National Weather Service API");

  await page.goto("/?sort=updates&order=asc");
  const sortedFirst = firstDataRow().getByRole("link").first();
  await expect(sortedFirst).toBeVisible();
  await sortedFirst.click();
  await expect(page).toHaveURL(/\/datasets\/[^/]+\/?$/);
  await page.goBack();
  await expect(page).toHaveURL((url) => url.searchParams.get("sort") === "updates");
});

test("mobile filter drawer closes at the desktop breakpoint", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/");

  await page.getByRole("button", { name: filterCopy.moreFiltersLabel, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: catalogCopy.drawerTitle });
  await expect(dialog).toBeVisible();

  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(dialog).toBeHidden();
  await expect(page.locator("#desktop-dataset-theme")).toBeVisible();
  await expect(
    page.getByRole("button", { name: filterCopy.moreFiltersLabel, exact: true }),
  ).toBeFocused();
});

test("advanced desktop filters stay within the drawer and remain fully reachable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: filterCopy.moreFiltersLabel, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: catalogCopy.drawerTitle });
  const scroller = dialog.locator(".overflow-y-auto");
  await dialog.locator("summary").filter({ hasText: filterCopy.domainLabel }).click();
  await dialog.locator("summary").filter({ hasText: filterCopy.formatLabel }).click();
  const dimensions = await scroller.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(dimensions.clientHeight).toBeLessThanOrEqual(900);
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);
  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(
    dialog.locator("summary").filter({ hasText: filterCopy.geographyLabel }),
  ).toBeVisible();
});

test("the filter drawer can apply a domain filter", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: filterCopy.moreFiltersLabel, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: catalogCopy.drawerTitle });
  await dialog.locator("summary").filter({ hasText: filterCopy.domainLabel }).click();
  await dialog.locator("label").filter({ hasText: "Natural Hazards" }).click();
  await expect(page).toHaveURL((url) =>
    url.searchParams.getAll("domain").includes("Natural Hazards"),
  );
  await expect(page.getByLabel(catalogCopy.activeFiltersAriaLabel)).toContainText(
    `${filterChipPrefixes.domains}: Natural Hazards`,
  );
});

test("application copy reflows across supported viewport widths", async ({ page }) => {
  for (const width of [360, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const heroTitle = page.getByRole("heading", { name: catalogCopy.heroTitle });
    await expect(heroTitle).toBeVisible();
    if (width >= 1024) {
      await expect(heroTitle).toHaveCSS("white-space", "nowrap");
    }
    if (width === 360) {
      const lineWidths = await heroTitle.evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return [...range.getClientRects()]
          .map((box) => box.width)
          .filter((width) => width > 1);
      });
      expect(lineWidths.length).toBeGreaterThan(1);
      expect(lineWidths.at(-1) ?? 0).toBeGreaterThan(220);
    }

    const cards = page.locator('[data-slot="card"]');
    if (width < 1024) {
      await expect(cards.first()).toBeVisible();
    } else {
      await expect(page.getByRole("table", { name: tableCopy.caption })).toBeVisible();
      await expect(cards.first()).toBeHidden();
    }
    if (width >= 768 && width < 1024) {
      const [first, second] = await Promise.all([
        cards.nth(0).boundingBox(),
        cards.nth(1).boundingBox(),
      ]);
      expect(first?.y).toBe(second?.y);
      expect(first?.height).toBe(second?.height);
    }
    if (width === 1440) {
      expect((await page.locator("#results-title").boundingBox())?.y).toBeLessThan(160);
      expect((await page.getByRole("table", { name: tableCopy.caption }).boundingBox())?.y).toBeLessThan(280);
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
  test.setTimeout(90_000);
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
