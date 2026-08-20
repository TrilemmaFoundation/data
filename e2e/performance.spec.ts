import fs from "node:fs";
import zlib from "node:zlib";
import { expect, test, type Page } from "@playwright/test";
import { getAllDatasets, getCatalogDatasets } from "../src/lib/datasets";
import { catalogCopy } from "../src/content/site-copy";
import {
  EMPTY_FILTERS,
  deriveCatalogPage,
} from "../src/lib/search";

const INITIAL_DATASET_COUNT = 5;
const PER_DATASET_HTML_BUDGET = 2_000;
const PER_DATASET_RSC_BUDGET = 1_550;
const addedDatasets = Math.max(0, getAllDatasets().length - INITIAL_DATASET_COUNT);

const BUDGETS = {
  javascript: 1_060_000,
  css: 90_000,
  // Static HTML now includes build-path cards and the catalog.
  html: 185_000 + addedDatasets * PER_DATASET_HTML_BUDGET,
  rsc: 50_000 + addedDatasets * PER_DATASET_RSC_BUDGET,
  gzipCode: 360_000,
  analytics: 40_000,
  notebooks: 8_000_000,
  catalogJson: 250_000,
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

function catalogPayloadDiagnostics(datasets: ReturnType<typeof getCatalogDatasets>) {
  const serialized = JSON.stringify(datasets);
  const sample = datasets[0];
  const contribution = sample
    ? Object.fromEntries(
        Object.keys(sample).map((field) => [
          field,
          JSON.stringify(datasets.map((dataset) => dataset[field as keyof typeof dataset])).length,
        ]),
      )
    : {};
  return {
    count: datasets.length,
    bytes: serialized.length,
    contribution,
  };
}

test("initial catalog assets stay within attributed budgets", async ({ page }) => {
  const catalog = catalogPayloadDiagnostics(getCatalogDatasets());
  const measured = {
    ...(await initialCodeBytes(page, "/")),
    ...staticExportBytes(),
    catalogJson: catalog.bytes,
  };
  console.log("Catalog asset budget:", measured);
  console.log("Catalog payload fields:", catalog);

  expect(measured.javascript).toBeLessThan(BUDGETS.javascript);
  expect(measured.css).toBeLessThan(BUDGETS.css);
  expect(measured.html).toBeLessThan(BUDGETS.html);
  expect(measured.rsc).toBeLessThan(BUDGETS.rsc);
  expect(measured.gzipCode).toBeLessThan(BUDGETS.gzipCode);
  expect(measured.catalogJson).toBeLessThan(BUDGETS.catalogJson);
});

test("static catalog HTML includes dataset content", () => {
  const html = fs.readFileSync("out/index.html", "utf8");
  const body = html.split(/<body\b/i)[1] ?? "";
  const preScript = body.split(/<script[\s>]/i)[0] ?? "";
  const firstPage = deriveCatalogPage(getCatalogDatasets(), EMPTY_FILTERS, null, 1);
  const firstVisible = firstPage.paginated.items[0];

  expect(preScript).not.toContain("BAILOUT_TO_CLIENT_SIDE_RENDERING");
  expect(preScript).not.toContain("Preparing the dataset catalog");
  expect(preScript).toContain(catalogCopy.heroTitle);
  expect(preScript).toContain("dataset-search");
  expect(firstVisible).toBeDefined();
  expect(preScript).toContain(firstVisible!.name);
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
  expect(collectionHtml.toString()).toContain("Start with a First Microproduct");

  const notebookDir = "public/notebooks";
  const notebookBytes = fs.existsSync(notebookDir)
    ? fs
        .readdirSync(notebookDir)
        .filter((file) => file.endsWith(".ipynb"))
        .reduce((total, file) => total + fs.statSync(`${notebookDir}/${file}`).size, 0)
    : 0;
  expect(notebookBytes).toBeLessThan(BUDGETS.notebooks);
});

test("catalog search input stays within a generous interaction budget", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(catalogCopy.searchLabel).waitFor();
  const metrics = await page.evaluate(async () => {
    const input = document.getElementById("dataset-search") as HTMLInputElement | null;
    if (!input) throw new Error("missing catalog search input");
    const paints: number[] = [];
    const longTasks: number[] = [];
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "longtask" && entry.duration > 50) {
          longTasks.push(entry.duration);
        }
      }
    });
    try {
      observer.observe({ type: "longtask", buffered: true } as PerformanceObserverInit);
    } catch {
      observer.disconnect();
    }
    for (const character of "weather") {
      const start = performance.now();
      input.value += character;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      paints.push(performance.now() - start);
    }
    observer.disconnect();
    const sorted = [...paints].sort((left, right) => left - right);
    const percentile = (values: number[], ratio: number) =>
      values[Math.min(values.length - 1, Math.floor(values.length * ratio))] ?? 0;
    return {
      p50: percentile(sorted, 0.5),
      p95: percentile(sorted, 0.95),
      longTasks: longTasks.length,
    };
  });
  console.log("Catalog search input latency:", metrics);
  expect(metrics.p95).toBeLessThan(1_000);
});
