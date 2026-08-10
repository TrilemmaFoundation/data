import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { DatasetSchema, type Dataset } from "./schema";

const DATASETS_DIR = path.join(process.cwd(), "data", "datasets");

export function getDatasetsDir(): string {
  return DATASETS_DIR;
}

export function listDatasetFiles(dir: string = DATASETS_DIR): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".yaml") && !file.startsWith("_"))
    .sort();
}

export type DatasetLoadError = {
  file: string;
  messages: string[];
};

export type DatasetLoadResult = {
  datasets: Dataset[];
  errors: DatasetLoadError[];
};

/**
 * Load and validate every dataset YAML. Does not throw — returns structured errors.
 */
export function loadDatasets(dir: string = DATASETS_DIR): DatasetLoadResult {
  const files = listDatasetFiles(dir);
  const datasets: Dataset[] = [];
  const errors: DatasetLoadError[] = [];
  const seenIds = new Map<string, string>();

  for (const file of files) {
    const filePath = path.join(dir, file);
    const idFromFilename = file.replace(/\.yaml$/, "");
    const messages: string[] = [];

    let raw: unknown;
    try {
      const contents = fs.readFileSync(filePath, "utf8");
      raw = parseYaml(contents);
    } catch (error) {
      messages.push(
        `YAML parse error: ${error instanceof Error ? error.message : String(error)}`,
      );
      errors.push({ file, messages });
      continue;
    }

    const parsed = DatasetSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const where = issue.path.length ? issue.path.join(".") : "(root)";
        messages.push(`${where}: ${issue.message}`);
      }
      errors.push({ file, messages });
      continue;
    }

    const dataset = parsed.data;

    if (dataset.id !== idFromFilename) {
      messages.push(
        `id "${dataset.id}" must match filename "${idFromFilename}"`,
      );
    }

    const previousFile = seenIds.get(dataset.id);
    if (previousFile) {
      messages.push(
        `duplicate id "${dataset.id}" (also in ${previousFile})`,
      );
    } else {
      seenIds.set(dataset.id, file);
    }

    if (messages.length > 0) {
      errors.push({ file, messages });
      continue;
    }

    datasets.push(dataset);
  }

  return { datasets, errors };
}

/**
 * Load all datasets or throw a build-breaking aggregated error.
 */
export function getAllDatasets(dir: string = DATASETS_DIR): Dataset[] {
  const { datasets, errors } = loadDatasets(dir);

  if (errors.length > 0) {
    const details = errors
      .map(
        (error) =>
          `${error.file}:\n${error.messages.map((m) => `  - ${m}`).join("\n")}`,
      )
      .join("\n");
    throw new Error(`Invalid dataset metadata:\n${details}`);
  }

  return datasets.sort((a, b) => a.name.localeCompare(b.name));
}

export function getDatasetById(
  id: string,
  dir: string = DATASETS_DIR,
): Dataset | undefined {
  return getAllDatasets(dir).find((dataset) => dataset.id === id);
}
