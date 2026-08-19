import fs from "node:fs";
import zlib from "node:zlib";
import { expect, test, type Page } from "@playwright/test";
import { getAllDatasets, getDatasetById } from "../src/lib/datasets";
import { catalogCopy } from "../src/content/site-copy";

const INITIAL_DATASET_COUNT = 5;
const PER_DATASET_MARKUP_BUDGET = 3_000;
const addedDatasetBudget =
  Math.max(0, getAllDatasets().length - INITIAL_DATASET_COUNT) *
  PER_DATASET_MARKUP_BUDGET;

const BUDGETS = {
  javascript: 1_060_000,
  css: 90_000,
  // Static HTML now includes build-path cards and the catalog.
  html: 175_000 + addedDatasetBudget,
  rsc: 40_000 + addedDatasetBudget,
  gzipCode: 360_000,
  analytics: 40_000,
  notebooks: 8_000_000,
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

test("static catalog HTML includes dataset content", () => {
  const html = fs.readFileSync("out/index.html", "utf8");
  const body = html.split(/<body\b/i)[1] ?? "";
  const preScript = body.split(/<script[\s>]/i)[0] ?? "";
  const recommended = getDatasetById(catalogCopy.recommendedDatasetId);

  expect(preScript).not.toContain("BAILOUT_TO_CLIENT_SIDE_RENDERING");
  expect(preScript).not.toContain("Preparing the dataset catalog");
  expect(preScript).toContain(catalogCopy.heroTitle);
  expect(preScript).toContain("dataset-search");
  expect(recommended).toBeDefined();
  expect(preScript).toContain(recommended!.name);
  expect(preScript).toContain(catalogCopy.buildPathsTitle);
});

test("analytics, landing, and notebook assets stay within attributed budgets", async ({
  page,
}) => {
  const analytics = await initialCodeBytes(page, "/");
  const analyticsHint = fs.readFileSync("out/index.html", "utf8").includes("@vercel/analytics")
    || fs.readFileSync("src/components/PageviewAnalytics.tsx", "utf8").includes("@vercel/analytics");
  expect(analyticsHint).toBe(true);
  expect(analytics.javascript).toBeLessThan(BUDGETS.javascript + BUDGETS.analytics);

  const collectionHtmlPath = fs.existsSync("out/collections/first-builds.html")
    ? "out/collections/first-builds.html"
    : "out/collections/first-builds/index.html";
  const collectionHtml = fs.readFileSync(collectionHtmlPath);
  expect(collectionHtml.byteLength).toBeLessThan(BUDGETS.html);
  expect(collectionHtml.toString()).toContain("Start with a first microproduct");

  const notebookDir = "public/notebooks";
  const notebookBytes = fs.existsSync(notebookDir)
    ? fs
        .readdirSync(notebookDir)
        .filter((file) => file.endsWith(".ipynb"))
        .reduce((total, file) => total + fs.statSync(`${notebookDir}/${file}`).size, 0)
    : 0;
  expect(notebookBytes).toBeLessThan(BUDGETS.notebooks);
});
