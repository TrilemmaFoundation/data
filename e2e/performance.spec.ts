import { expect, test, type Page } from "@playwright/test";

async function initialCodeBytes(page: Page, path: string): Promise<number> {
  const bodies: Array<Promise<number>> = [];
  page.on("response", (response) => {
    if (/\.(?:js|css)$/.test(new URL(response.url()).pathname)) {
      bodies.push(response.body().then((body) => body.byteLength).catch(() => 0));
    }
  });
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  return (await Promise.all(bodies)).reduce((total, bytes) => total + bytes, 0);
}

test("initial catalog code stays within its static-export budget", async ({ page }) => {
  expect(await initialCodeBytes(page, "/")).toBeLessThan(1_000_000);
});
