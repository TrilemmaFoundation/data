import { existsSync, readdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const appIdentities = [
  { slug: "titanskies", name: "TitanSkies", accent: "#0369A1", image: "/apps/titanskies-white.webp" },
  { slug: "hyperoptions", name: "HyperOptions", accent: "#DFAB40", letter: "H" },
  { slug: "travelcanary", name: "TravelCanary", accent: "#0F766E", image: "/apps/travelcanary-white.webp" },
  { slug: "househunter", name: "HouseHunter", accent: "#56D1C8", letter: "H" },
  { slug: "rockyroad", name: "RockyRoad", accent: "#B95732", letter: "R" },
  { slug: "stackingsats", name: "StackingSats", accent: "#F7931A", image: "/apps/stackingsats.svg" },
] as const;
const appNames = appIdentities.map(({ slug, name }) => [slug, name] as const);

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

test("each app has its own rendered color and a working local mark on cards and details", async ({ page, request }) => {
  await page.goto("/apps");
  const cards = page.getByRole("article");
  const backgrounds = new Set<string>();
  const edges = new Set<string>();

  for (const [index, identity] of appIdentities.entries()) {
    const card = cards.nth(index);
    const style = await card.evaluate((element) => {
      const css = getComputedStyle(element);
      return {
        accent: css.getPropertyValue("--app-accent").trim(),
        background: css.backgroundColor,
        edge: css.borderLeftColor,
        edgeWidth: parseFloat(css.borderLeftWidth),
      };
    });
    expect(style.accent, identity.slug).toBe(identity.accent);
    expect(style.edgeWidth, identity.slug).toBeGreaterThanOrEqual(3);
    backgrounds.add(style.background);
    edges.add(style.edge);

    await expect(card.getByRole("heading", { level: 2, name: identity.name })).toBeVisible();
    await expect(card.getByRole("link", { name: identity.name, exact: true })).toHaveAttribute("href", `/apps/${identity.slug}`);
    if ("image" in identity) {
      const logo = card.locator(`img[src="${identity.image}"]`);
      await expect(logo).toBeVisible();
      expect((await request.get(identity.image)).ok(), identity.image).toBe(true);
      expect(await logo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0), identity.slug).toBe(true);
    } else {
      await expect(card.locator(".app-mark")).toHaveText(identity.letter);
      await expect(card.locator("img")).toHaveCount(0);
    }
  }
  expect(backgrounds.size).toBe(6);
  expect(edges.size).toBe(6);

  for (const identity of appIdentities) {
    await page.goto(`/apps/${identity.slug}`);
    const header = page.locator(".app-detail-header");
    await expect(header.getByRole("heading", { level: 1, name: identity.name })).toBeVisible();
    expect(await header.evaluate((element) => getComputedStyle(element).getPropertyValue("--app-accent").trim())).toBe(identity.accent);
    if ("image" in identity) {
      const logo = header.locator(`img[src="${identity.image}"]`);
      await expect(logo).toBeVisible();
      expect(await logo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0), identity.slug).toBe(true);
    } else {
      await expect(header.locator(".app-mark")).toHaveText(identity.letter);
    }
  }
});

test("branded cards reflow without horizontal clipping on narrow screens and at 200% text", async ({ page }) => {
  for (const { width, zoom } of [
    { width: 320, zoom: false },
    { width: 320, zoom: true },
    { width: 390, zoom: false },
    { width: 390, zoom: true },
    { width: 768, zoom: false },
  ]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/apps");
    if (zoom) await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const [index, identity] of appIdentities.entries()) {
      const card = page.getByRole("article").nth(index);
      await expect(card.getByRole("heading", { level: 2, name: identity.name })).toBeVisible();
      await card.scrollIntoViewIfNeeded();
      const bounds = await card.boundingBox();
      expect(bounds!.x, identity.slug).toBeGreaterThanOrEqual(-1);
      expect(bounds!.x + bounds!.width, identity.slug).toBeLessThanOrEqual(width + 1);
      await expect(card.getByRole("link", { name: /Source Code/ })).toBeVisible();
    }
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
