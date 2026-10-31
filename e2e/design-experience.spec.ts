import { expect, test } from '@playwright/test';

const families = ['/', '/apps', '/collections', '/collections/first-builds', '/themes/environment-hazards', '/datasets/usgs-earthquakes', '/datasets/nasa-firms', '/contribute', '/404'];
for (const width of [320, 390, 768, 1023, 1024, 1280, 1536]) {
  test(`shared surfaces reflow at ${width}px`, async ({ page, browserName }, info) => {
    test.skip(browserName !== 'chromium' && ![390, 1280].includes(width));
    for (const path of families) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if ([390,1280].includes(width)) await page.screenshot({ path: info.outputPath(`${path.replace(/[^a-z0-9]/gi, '_') || 'home'}.png`) });
    }
  });
}

test('200% text and reduced motion retain search and reading context', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of families) {
    await page.goto(path);
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('main h1')).toBeVisible();
  }
});

test('TravelCanary source list remains readable at narrow and desktop widths and 200% text', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium');
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/apps/travelcanary');
    const sources = page.locator('main section[aria-labelledby="app-sources-title"] > section > ul > li');
    expect(await sources.count()).toBeGreaterThan(20);
    await sources.last().scrollIntoViewIfNeeded();
    await expect(sources.last()).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 390) {
      await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByRole('heading', { level: 1, name: 'TravelCanary' })).toBeVisible();
    }
  }
});

test('guide anchors use the shared shell offset without an extra fixed-header gap', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/datasets/usgs-earthquakes');
    await page.locator('a[href="#getting-started"]').click();
    const shell = await page.locator('.data-header').boundingBox();
    const section = await page.locator('#getting-started').boundingBox();
    expect(section!.y - shell!.height).toBeGreaterThanOrEqual(16);
    expect(section!.y - shell!.height).toBeLessThanOrEqual(33);
    await expect(page.locator('#guide-title')).toBeInViewport({ ratio: 1 });
  }
});

test('catalog and contribution fields use the accessible input boundary token', async ({ page }) => {
  for (const path of ['/', '/contribute']) {
    await page.goto(path);
    for (const field of await page.locator('input[type="search"], select, textarea').all()) {
      await expect(field).toHaveCSS('border-color', 'rgb(88, 88, 200)');
    }
  }
});

test('contribution labels stay directly above their controls when the form reflows', async ({ page }) => {
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/contribute');
    for (const id of ['theme-guide', 'difficulty-guide']) {
      const label = await page.locator(`label[for="${id}"]`).boundingBox();
      const field = await page.locator(`#${id}`).boundingBox();
      expect(Math.abs(label!.x - field!.x)).toBeLessThanOrEqual(1);
      expect(field!.y - label!.y - label!.height).toBeGreaterThanOrEqual(7);
      expect(field!.y - label!.y - label!.height).toBeLessThanOrEqual(9);
    }
  }
});




test('only local navigation is rendered and offsets track its actual height', async ({ page }) => {
  for (const width of [320, 390, 768, 1023, 1024, 1280, 1536]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    const header = page.locator('.data-header');
    const logo = page.getByRole('link', { name: 'Visit Trilemma Foundation' });
    await expect(header).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Data navigation', exact: true })).toBeVisible();
    await expect(page.locator('.foundation-header, .foundation-header-bar')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open site menu' })).toHaveCount(0);
    const box = await header.boundingBox();
    const logoBox = await logo.boundingBox();
    await expect(logo).toHaveAttribute('href', 'https://www.trilemma.foundation/');
    await expect(logo).not.toHaveAttribute('target');
    await expect(logo.locator('img')).toHaveAttribute('src', '/foundation/symbol.svg');
    await expect(logo.locator('img')).toHaveAttribute('alt', '');
    await expect.poll(() => logo.locator('img').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    expect(box!.y).toBe(0);
    expect(logoBox!.width).toBeGreaterThanOrEqual(44);
    expect(logoBox!.height).toBeGreaterThanOrEqual(44);
    expect(logoBox!.x + logoBox!.width / 2).toBeCloseTo(box!.x + box!.width / 2, 0);
    expect(box!.height).toBeLessThan(width >= 1024 ? 65 : 120);
    await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--foundation-shell-height')))).toBeCloseTo(box!.height, 0);
    for (const link of await header.locator('a').all()) await expect(link).toBeInViewport({ ratio: 1 });
  }
});

test('narrow header keeps local routes reachable below the centered mark', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/apps');
  const local = page.getByRole('navigation', { name: 'Data navigation' });
  const brandBox = await local.getByRole('link', { name: 'Trilemma Data home' }).boundingBox();
  const logoBox = await local.getByRole('link', { name: 'Visit Trilemma Foundation' }).boundingBox();
  expect(brandBox!.y).toBeCloseTo(logoBox!.y, 0);
  const routes = local.locator('.foundation-local-links a');
  expect(await routes.count()).toBe(4);
  for (const link of await routes.all()) {
    const box = await link.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(logoBox!.y + logoBox!.height);
    await expect(link).toBeInViewport({ ratio: 1 });
  }
});

test('centered Foundation link and local routes remain usable with 200% header text', async ({ page }) => {
  for (const width of [320, 1024, 1536]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/apps');
    await page.addStyleTag({ content: '.data-header .foundation-local-inner a { font-size: 28px !important; }' });
    const header = page.locator('.data-header');
    const logo = page.getByRole('link', { name: 'Visit Trilemma Foundation' });
    const headerBox = await header.boundingBox();
    const logoBox = await logo.boundingBox();
    expect(logoBox!.x + logoBox!.width / 2).toBeCloseTo(headerBox!.x + headerBox!.width / 2, 0);
    const local = page.getByRole('navigation', { name: 'Data navigation' });
    const targets = [local.getByRole('link', { name: 'Trilemma Data home' }), logo, ...await local.locator('.foundation-local-links a').all()];
    const boxes = await Promise.all(targets.map((target) => target.boundingBox()));
    for (const box of boxes) expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    for (const link of targets) await expect(link).toBeInViewport({ ratio: 1 });
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        expect(a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height).toBe(false);
      }
    }
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('local navigation links change routes from the keyboard', async ({ page }) => {
  await page.goto('/');
  const local = page.getByRole('navigation', { name: 'Data navigation' });
  const apps = local.getByRole('link', { name: 'Apps', exact: true });
  await apps.focus();
  await expect(apps).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/apps\/?$/);
  await expect(local.getByRole('link', { name: 'Apps', exact: true })).toHaveAttribute('aria-current', 'page');
});
