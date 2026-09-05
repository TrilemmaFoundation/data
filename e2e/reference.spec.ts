import { expect, test } from '@playwright/test';

test('capture original and current catalog reference', async ({ page }, info) => {
  test.skip(!process.env.REFERENCE_URL, 'Optional original-revision preview');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const variant of ['before', 'after']) {
      await page.goto(variant === 'before' ? process.env.REFERENCE_URL! : '/');
      await expect(page.locator('#dataset-search')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: info.outputPath(`catalog-${variant}-${width}.png`) });
    }
  }
});
