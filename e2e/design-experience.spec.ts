import { expect, test } from '@playwright/test';

const families = ['/', '/collections', '/collections/first-builds', '/themes/environment-hazards', '/datasets/usgs-earthquakes', '/datasets/nasa-firms', '/contribute', '/404'];
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
    await expect(header).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Data navigation', exact: true })).toBeVisible();
    await expect(page.locator('.foundation-header, .foundation-header-bar')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open site menu' })).toHaveCount(0);
    const box = await header.boundingBox();
    expect(box!.y).toBe(0);
    expect(box!.height).toBeLessThan(width >= 1024 ? 65 : 120);
    await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--foundation-shell-height')))).toBeCloseTo(box!.height, 0);
    for (const link of await header.locator('a').all()) await expect(link).toBeInViewport({ ratio: 1 });
  }
});
