import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getAllDatasets } from "../src/lib/datasets";
import { getAllCollections } from "../src/lib/collections";
import { loadVocabulary } from "../src/lib/vocabulary";
import { loadMaintainers } from "../src/lib/maintainers";
import { generatedNotebooks, notebookDrift, NOTEBOOKS_PUBLIC_DIR } from "../src/lib/notebooks";
import { exceptionExpiryWarnings } from "../src/lib/url-validation";
import { buildMaintenanceReport, formatMaintenanceMarkdown } from "../src/lib/maintenance";

function readNotebooks(): Record<string, string> {
  const dir = path.join(process.cwd(), NOTEBOOKS_PUBLIC_DIR);
  if (!fs.existsSync(dir)) return {};
  return Object.fromEntries(
    fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".ipynb"))
      .map((file) => [file, fs.readFileSync(path.join(dir, file), "utf8")]),
  );
}

function changedProviderFiles(): string[] {
  const result = spawnSync(
    "git",
    [
      "log",
      "--since=30 days ago",
      "-G",
      "^(url:|license_url:)",
      "--name-only",
      "--pretty=format:",
      "--",
      "data/datasets",
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) return [];
  return [...new Set((result.stdout ?? "").split("\n").map((line) => line.trim()).filter(Boolean))];
}

function canaryFailuresFromEnv(): string[] {
  const raw = process.env.PYTHON_CANARY_FAILURES ?? "";
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function main() {
  const datasets = getAllDatasets();
  const collections = getAllCollections();
  const vocabulary = loadVocabulary();
  const maintainers = loadMaintainers();
  const report = buildMaintenanceReport({
    datasets,
    collections,
    vocabularyErrors: vocabulary.errors,
    maintainerErrors: maintainers.errors,
    exceptionWarnings: exceptionExpiryWarnings(),
    notebookDrift: notebookDrift(generatedNotebooks(datasets), readNotebooks()),
    canaryFailures: canaryFailuresFromEnv(),
    changedProviderFiles: changedProviderFiles(),
  });

  const markdown = formatMaintenanceMarkdown(report);
  const outDir = path.join(process.cwd(), "reports");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "maintenance-report.md"), markdown);
  fs.writeFileSync(path.join(outDir, "maintenance-report.json"), `${JSON.stringify(report, null, 2)}\n`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  }
  console.log(markdown);
}

main();
