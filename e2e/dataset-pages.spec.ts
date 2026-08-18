import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { datasetGuideCopy } from "../src/content/site-copy";
import { getAllDatasets } from "../src/lib/datasets";
import { datasetJsonLd, serializeJsonLd } from "../src/lib/seo";
import type { Dataset } from "../src/lib/schema";

function datasetExportPath(id: string): string {
  const nested = path.join("out", "datasets", id, "index.html");
  const flat = path.join("out", "datasets", `${id}.html`);
  if (fs.existsSync(nested)) return nested;
  if (fs.existsSync(flat)) return flat;
  throw new Error(`static export is missing for ${id}`);
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'");
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function visibleText(html: string): string {
  const body = html.split(/<body\b/i)[1] ?? html;
  const withoutScripts = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ");
  return normalizeSpace(decodeHtml(withoutScripts.replace(/<[^>]+>/g, " ")));
}

function headingText(html: string): string {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return normalizeSpace(decodeHtml(match?.[1] ?? ""));
}

function expectGuideHtml(dataset: Dataset, html: string) {
  const text = visibleText(html);

  expect(headingText(html), `${dataset.id} heading`).toBe(dataset.name);
  expect(text, `${dataset.id} description`).toContain(
    normalizeSpace(dataset.description),
  );
  expect(text, `${dataset.id} overview`).toContain(
    normalizeSpace(dataset.getting_started.overview),
  );
  expect(text, `${dataset.id} at a glance`).toContain(datasetGuideCopy.atAGlanceTitle);
  expect(text, `${dataset.id} guide title`).toContain(datasetGuideCopy.guideTitle);
  expect(text, `${dataset.id} setup`).toContain(datasetGuideCopy.setupTitle);
  expect(text, `${dataset.id} access`).toContain(datasetGuideCopy.accessTitle);
  expect(text, `${dataset.id} python title`).toContain(datasetGuideCopy.pythonTitle);
  expect(text, `${dataset.id} first project`).toContain(
    datasetGuideCopy.firstProjectEyebrow,
  );
  expect(text, `${dataset.id} official source`).toContain(
    datasetGuideCopy.officialSourceLabel,
  );
  expect(html, `${dataset.id} source href`).toContain(
    `href="${escapeAttribute(dataset.url)}"`,
  );
  expect(html, `${dataset.id} license href`).toContain(
    `href="${escapeAttribute(dataset.license_url)}"`,
  );
  expect(text, `${dataset.id} python`).toContain(
    normalizeSpace(dataset.getting_started.python.code),
  );
  expect(text, `${dataset.id} project title`).toContain(
    dataset.getting_started.first_project.title,
  );
  for (const step of dataset.getting_started.first_project.steps) {
    expect(text, `${dataset.id} project step`).toContain(normalizeSpace(step));
  }
  expect(html, `${dataset.id} json-ld`).toContain(
    serializeJsonLd(datasetJsonLd(dataset)),
  );
}

test("every dataset guide is present in the static export", () => {
  const datasets = getAllDatasets();
  expect(datasets.length).toBeGreaterThan(0);

  for (const dataset of datasets) {
    const html = fs.readFileSync(datasetExportPath(dataset.id), "utf8");
    expectGuideHtml(dataset, html);
  }
});
