import fs from "node:fs";
import path from "node:path";
import { getAllDatasets } from "../src/lib/datasets";
import { getAllCollections } from "../src/lib/collections";
import { loadVocabulary } from "../src/lib/vocabulary";
import { loadMaintainers } from "../src/lib/maintainers";
import { generatedNotebooks, notebookDrift, NOTEBOOKS_PUBLIC_DIR } from "../src/lib/notebooks";
import { parseCanaryFailureLines } from "../src/lib/python-runtime";
import { validateDatasetUrls } from "../src/lib/url-validation";
import { buildMaintenanceReport } from "../src/lib/maintenance";
import {
  collectUrlFindings,
  maintenanceExitCode,
  writeMaintenanceArtifacts,
} from "../src/lib/maintenance-run";
import { sanitizeDiagnostic } from "../src/lib/diagnostics";
import { changedProviderFiles } from "./maintenance-history";

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

function canaryFailuresFromEnv(): string[] {
  return parseCanaryFailureLines(process.env.PYTHON_CANARY_FAILURES ?? "");
}

async function main() {
  const offline = process.argv.slice(2).includes("--offline");
  const datasets = getAllDatasets();
  const collections = getAllCollections();
  const vocabulary = loadVocabulary();
  const maintainers = loadMaintainers();
  const { urlErrors, exceptionWarnings } = await collectUrlFindings({
    offline,
    datasets,
    validateUrls: offline ? undefined : validateDatasetUrls,
  });
  const report = buildMaintenanceReport({
    datasets,
    collections,
    vocabularyErrors: vocabulary.errors,
    maintainerErrors: maintainers.errors,
    urlErrors,
    exceptionWarnings,
    notebookDrift: notebookDrift(generatedNotebooks(datasets), readNotebooks()),
    canaryFailures: canaryFailuresFromEnv(),
    changedProviderFiles: changedProviderFiles(),
  });

  const { markdown } = writeMaintenanceArtifacts(report, {
    outDir: path.join(process.cwd(), "reports"),
    githubStepSummary: process.env.GITHUB_STEP_SUMMARY,
  });
  console.log(markdown);
  process.exit(maintenanceExitCode(urlErrors));
}

main().catch((error) => {
  console.error(sanitizeDiagnostic(String(error)));
  process.exit(1);
});
