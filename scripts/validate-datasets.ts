import { loadDatasets, getDatasetsDir } from "../src/lib/datasets";
import { exceptionExpiryWarnings, validateDatasetUrls } from "../src/lib/url-validation";
import { validatePythonSyntaxBatch } from "../src/lib/python-validation";
import { validateDatasetPolicy } from "../src/lib/catalog-validation";
import { sanitizeDiagnostic } from "../src/lib/diagnostics";

async function main() {
  const offline = process.argv.slice(2).includes("--offline");
  const { datasets, errors } = loadDatasets(getDatasetsDir());
  const urlValidation = offline
    ? { errors: new Map<string, string[]>(), warnings: new Map<string, string[]>() }
    : await validateDatasetUrls(datasets);

  if (!offline) {
    for (const warning of exceptionExpiryWarnings()) {
      console.warn(sanitizeDiagnostic(`! ${warning}`));
    }
  }

  const allErrors: { file: string; messages: string[] }[] = [...errors];
  const pythonErrors = validatePythonSyntaxBatch(
    datasets.map((dataset) => dataset.getting_started.python.code),
  );

  for (const [index, dataset] of datasets.entries()) {
    const file = `${dataset.id}.yaml`;
    const messages: string[] = [];

    messages.push(...validateDatasetPolicy(dataset));

    const pythonError = pythonErrors[index];
    if (pythonError) {
      messages.push(`getting_started.python.code: ${pythonError}`);
    }

    messages.push(...(urlValidation.errors.get(file) ?? []));

    if (messages.length > 0) {
      allErrors.push({ file, messages });
    }
  }

  for (const [file, warnings] of urlValidation.warnings) {
    for (const warning of warnings) {
      console.warn(sanitizeDiagnostic(`! ${file}: ${warning}`));
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
    console.error(sanitizeDiagnostic(error.file));
    for (const message of error.messages) {
      console.error(`  - ${sanitizeDiagnostic(message)}`);
    }
    console.error("");
  }
  process.exit(1);
}

main().catch((error) => {
  console.error(sanitizeDiagnostic(String(error)));
  process.exit(1);
});
