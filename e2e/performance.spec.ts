import fs from "node:fs";
import zlib from "node:zlib";
import { expect, test, type Page } from "@playwright/test";

const BUDGETS = {
  javascript: 860_000,
  css: 76_000,
  html: 32_000,
  rsc: 22_000,
  gzipCode: 285_000,
};

async function initialCodeBytes(page: Page, path: string) {
  const bodies: Array<Promise<{ type: "javascript" | "css"; bytes: number }>> = [];
  page.on("response", (response) => {
    const pathname = new URL(response.url()).pathname;
    const type = pathname.endsWith(".js")
      ? "javascript"
      : pathname.endsWith(".css")
        ? "css"
        : null;
    if (type) bodies.push(response.body().then((body) => ({ type, bytes: body.byteLength })));
  });
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  return (await Promise.all(bodies)).reduce(
    (totals, body) => ({ ...totals, [body.type]: totals[body.type] + body.bytes }),
    { javascript: 0, css: 0 },
  );
}

function staticExportBytes() {
  const html = fs.readFileSync("out/index.html");
  const markup = html.toString();
  const assetPaths = [
    ...new Set(
      [...markup.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(
        (match) => match[1]!,
      ),
    ),
  ];
  const gzipCode = assetPaths.reduce((total, assetPath) => {
    const body = fs.readFileSync(`out/${assetPath.replace(/^\//, "")}`);
    return total + zlib.gzipSync(body).byteLength;
  }, 0);
  return {
    html: html.byteLength,
    rsc: fs.statSync("out/index.txt").size,
    gzipCode,
  };
}

test("initial catalog assets stay within attributed budgets", async ({ page }) => {
  const measured = {
    ...(await initialCodeBytes(page, "/")),
    ...staticExportBytes(),
  };
  console.log("Catalog asset budget:", measured);

  expect(measured.javascript).toBeLessThan(BUDGETS.javascript);
  expect(measured.css).toBeLessThan(BUDGETS.css);
  expect(measured.html).toBeLessThan(BUDGETS.html);
  expect(measured.rsc).toBeLessThan(BUDGETS.rsc);
  expect(measured.gzipCode).toBeLessThan(BUDGETS.gzipCode);
});
