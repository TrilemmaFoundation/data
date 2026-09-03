import { datasetCardCopy, datasetGuideCopy } from "../content/site-copy";
import type { Dataset } from "./schema";
import { isActiveDataset } from "./schema";
import { SITE_URL, datasetPath } from "./seo";

export const NOTEBOOKS_PUBLIC_DIR = "public/notebooks";

export function hasGeneratedNotebook(dataset: Dataset): boolean {
  return (
    isActiveDataset(dataset) &&
    dataset.difficulty === "beginner" &&
    !dataset.api_key_required
  );
}

export function notebookFilename(id: string): string {
  return `${id}.ipynb`;
}

export function colabNotebookUrl(
  datasetId: string,
  repositoryPath = "TrilemmaFoundation/data",
): string {
  return `https://colab.research.google.com/github/${repositoryPath}/blob/main/${NOTEBOOKS_PUBLIC_DIR}/${notebookFilename(datasetId)}`;
}

function markdownCell(source: string[]): Record<string, unknown> {
  return {
    cell_type: "markdown",
    metadata: {},
    source: source.map((line, index) =>
      index === source.length - 1 ? line : `${line}\n`,
    ),
  };
}

function codeCell(source: string[]): Record<string, unknown> {
  return {
    cell_type: "code",
    execution_count: null,
    metadata: {},
    outputs: [],
    source: source.map((line, index) =>
      index === source.length - 1 ? line : `${line}\n`,
    ),
  };
}

export function notebookFromDataset(dataset: Dataset): Record<string, unknown> {
  const install = `%pip install ${dataset.getting_started.python.packages.join(" ")}`;
  const guideUrl = `${SITE_URL}${datasetPath(dataset.id)}`;
  const codeLines = dataset.getting_started.python.code.replace(/\n$/, "").split("\n");
  const projectSteps = dataset.getting_started.first_project.steps.map(
    (step, index) => `${index + 1}. ${step}`,
  );

  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: {
        display_name: "Python 3",
        language: "python",
        name: "python3",
      },
      language_info: { name: "python" },
      trilemma: {
        dataset_id: dataset.id,
        last_verified: dataset.last_verified,
        generated: true,
      },
    },
    cells: [
      markdownCell([
        `# ${dataset.name}`,
        "",
        dataset.description.trim(),
        "",
        `- Guide: ${guideUrl}`,
        `- Official source: ${dataset.url}`,
        `- Data terms: ${dataset.license_url}`,
        `- Last verified: ${dataset.last_verified}`,
      ]),
      markdownCell([
        "## Overview",
        "",
        dataset.getting_started.overview.trim(),
      ]),
      markdownCell([
        "## Prerequisites",
        "",
        ...dataset.getting_started.prerequisites.map((item) => `- ${item}`),
      ]),
      markdownCell([
        `## ${datasetGuideCopy.accessTitle}`,
        "",
        ...dataset.getting_started.access_steps.map(
          (step, index) => `${index + 1}. ${step}`,
        ),
      ]),
      markdownCell(["## Install Packages", "", "Run this cell first."]),
      codeCell([`# ${install}`, install]),
      markdownCell([`## ${datasetGuideCopy.pythonExampleAriaLabel}`]),
      codeCell(codeLines),
      markdownCell([
        `## ${datasetCardCopy.firstProjectLabel}: ${dataset.getting_started.first_project.title}`,
        "",
        dataset.getting_started.first_project.goal.trim(),
        "",
        ...projectSteps,
      ]),
    ],
  };
}

export function serializeNotebook(notebook: Record<string, unknown>): string {
  return `${JSON.stringify(notebook, null, 2)}\n`;
}

export function generatedNotebooks(datasets: Dataset[]): Array<{
  id: string;
  filename: string;
  contents: string;
}> {
  return datasets
    .filter(hasGeneratedNotebook)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((dataset) => ({
      id: dataset.id,
      filename: notebookFilename(dataset.id),
      contents: serializeNotebook(notebookFromDataset(dataset)),
    }));
}

export function notebookDrift(
  expected: Array<{ filename: string; contents: string }>,
  onDisk: Record<string, string>,
): string[] {
  const messages: string[] = [];
  const expectedNames = new Set(expected.map((file) => file.filename));
  for (const file of expected) {
    const current = onDisk[file.filename];
    if (current === undefined) {
      messages.push(`missing generated notebook ${file.filename}`);
    } else if (current !== file.contents) {
      messages.push(`generated notebook ${file.filename} is out of date`);
    }
  }
  for (const filename of Object.keys(onDisk).sort()) {
    if (!expectedNames.has(filename)) {
      messages.push(`unexpected notebook ${filename}`);
    }
  }
  return messages;
}
