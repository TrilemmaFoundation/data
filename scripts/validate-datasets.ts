import { loadDatasets, getDatasetsDir } from "../src/lib/datasets";
import { validateDatasetUrls } from "../src/lib/url-validation";

function isOfflineMode(argv: string[]): boolean {
  return argv.includes("--offline");
}

function isFutureDate(isoDate: string): boolean {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  return isoDate > todayIso;
}

async function main() {
  const offline = isOfflineMode(process.argv.slice(2));
  const dir = getDatasetsDir();
  const { datasets, errors } = loadDatasets(dir);
  const urlErrors = offline
    ? new Map<string, string[]>()
    : await validateDatasetUrls(datasets);

  const allErrors: { file: string; messages: string[] }[] = [...errors];

  for (const dataset of datasets) {
    const file = `${dataset.id}.yaml`;
    const messages: string[] = [];

    if (isFutureDate(dataset.last_verified)) {
      messages.push(
        `last_verified ${dataset.last_verified} is in the future`,
      );
    }

    messages.push(...(urlErrors.get(file) ?? []));

    if (messages.length > 0) {
      allErrors.push({ file, messages });
    }
  }

  if (allErrors.length === 0) {
    console.log(
      `✓ Validated ${datasets.length} dataset(s)${offline ? " (offline)" : ""}.`,
    );
    process.exit(0);
  }

  console.error(`✗ Dataset validation failed:\n`);
  for (const error of allErrors) {
    console.error(`${error.file}`);
    for (const message of error.messages) {
      console.error(`  - ${message}`);
    }
    console.error("");
  }
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
