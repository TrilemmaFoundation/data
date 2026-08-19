import fs from "node:fs";
import path from "node:path";
import { getAllDatasets } from "../src/lib/datasets";
import {
  generatedNotebooks,
  notebookDrift,
  NOTEBOOKS_PUBLIC_DIR,
} from "../src/lib/notebooks";

function notebooksDir(): string {
  return path.join(process.cwd(), NOTEBOOKS_PUBLIC_DIR);
}

function readOnDisk(): Record<string, string> {
  const dir = notebooksDir();
  if (!fs.existsSync(dir)) return {};
  const files = fs.readdirSync(dir).filter((file) => file.endsWith(".ipynb"));
  return Object.fromEntries(
    files.map((file) => [file, fs.readFileSync(path.join(dir, file), "utf8")]),
  );
}

function writeNotebooks(
  expected: Array<{ filename: string; contents: string }>,
): void {
  const dir = notebooksDir();
  fs.mkdirSync(dir, { recursive: true });
  for (const file of expected) {
    fs.writeFileSync(path.join(dir, file.filename), file.contents);
  }
  for (const filename of Object.keys(readOnDisk())) {
    if (!expected.some((file) => file.filename === filename)) {
      fs.unlinkSync(path.join(dir, filename));
    }
  }
}

function main() {
  const check = process.argv.includes("--check");
  const expected = generatedNotebooks(getAllDatasets());
  const onDisk = readOnDisk();
  const drift = notebookDrift(expected, onDisk);

  if (check) {
    if (drift.length > 0) {
      console.error(drift.join("\n"));
      process.exit(1);
    }
    console.log(`Notebooks up to date (${expected.length} files).`);
    return;
  }

  writeNotebooks(expected);
  console.log(`Wrote ${expected.length} notebooks to ${NOTEBOOKS_PUBLIC_DIR}.`);
}

main();
