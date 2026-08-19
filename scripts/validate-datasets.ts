import { loadDatasets, getDatasetsDir } from "../src/lib/datasets";
import { exceptionExpiryWarnings, validateDatasetUrls } from "../src/lib/url-validation";
import { validatePythonSyntaxBatch } from "../src/lib/python-validation";
import {
  calendarAgeDays,
  COLLECTION_REVIEW_AGE_DAYS,
  validateDatasetPolicy,
  validateReplacementIds,
} from "../src/lib/catalog-validation";
import { validateGuideCopy } from "../src/lib/guide-validation";
import { sanitizeDiagnostic } from "../src/lib/diagnostics";
import { loadVocabulary, validateVocabularyCoverage } from "../src/lib/vocabulary";
import {
  loadCollections,
  validateCollectionMembership,
} from "../src/lib/collections";
import { loadMaintainers, validateMaintainerOverrides } from "../src/lib/maintainers";
import { isActiveDataset } from "../src/lib/schema";

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

  const vocabularyResult = loadVocabulary();
  if (vocabularyResult.errors.length > 0) {
    allErrors.push({ file: "vocabulary.yaml", messages: vocabularyResult.errors });
  }
  const vocabulary = vocabularyResult.vocabulary;

  const collectionsResult = loadCollections();
  allErrors.push(...collectionsResult.errors);
  const activeIds = new Set(
    datasets.filter(isActiveDataset).map((dataset) => dataset.id),
  );
  if (vocabulary) {
    for (const dataset of datasets) {
      const coverage = validateVocabularyCoverage(dataset, vocabulary);
      if (coverage.length > 0) {
        allErrors.push({ file: `${dataset.id}.yaml`, messages: coverage });
      }
    }
  }
  for (const collection of collectionsResult.collections) {
    const messages = validateCollectionMembership(collection, activeIds);
    const age = calendarAgeDays(collection.last_updated);
    if (age > COLLECTION_REVIEW_AGE_DAYS) {
      messages.push(
        `last_updated ${collection.last_updated} is ${age} days old; review within ${COLLECTION_REVIEW_AGE_DAYS} days`,
      );
    }
    if (collection.last_updated > new Date().toISOString().slice(0, 10)) {
      messages.push(`last_updated ${collection.last_updated} is in the future`);
    }
    if (messages.length > 0) {
      allErrors.push({ file: `${collection.id}.yaml`, messages });
    }
  }

  const maintainersResult = loadMaintainers();
  if (maintainersResult.errors.length > 0) {
    allErrors.push({ file: "maintainers.yaml", messages: maintainersResult.errors });
  } else if (maintainersResult.registry) {
    const maintainerMessages = validateMaintainerOverrides(
      datasets.map((dataset) => dataset.id),
      maintainersResult.registry,
    );
    if (maintainerMessages.length > 0) {
      allErrors.push({ file: "maintainers.yaml", messages: maintainerMessages });
    }
  }

  for (const message of validateReplacementIds(datasets)) {
    allErrors.push({ file: "catalog", messages: [message] });
  }

  for (const [index, dataset] of datasets.entries()) {
    const file = `${dataset.id}.yaml`;
    const messages: string[] = [];

    messages.push(...validateDatasetPolicy(dataset));
    messages.push(...validateGuideCopy(dataset));

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
