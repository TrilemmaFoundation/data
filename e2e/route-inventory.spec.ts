import { readdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
const routes = readdirSync('out', { recursive: true })
  .filter((file): file is string => typeof file === 'string' && file.endsWith('.html'))
  .map(file => '/' + file.replace(/index\.html$/, '').replace(/\.html$/, ''))
  .sort();

test('every exported route renders the shared shell without runtime errors', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const path of routes) {
    await page.goto(path);
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('.foundation-header')).toBeVisible();
    await expect(page.locator('.foundation-footer')).toBeVisible();
  }
  expect(errors).toEqual([]);
});
