import fs from "node:fs";
import { spawnSync } from "node:child_process";

type GitResult = {
  status: number | null;
  stdout?: string | Buffer | null;
};

type RunGit = (args: string[]) => GitResult;

function outputLines(result: GitResult): string[] {
  if (result.status !== 0) return [];
  return String(result.stdout ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function changedProviderFiles(options: {
  runGit?: RunGit;
  exists?: (file: string) => boolean;
} = {}): string[] {
  const runGit = options.runGit ?? ((args) =>
    spawnSync("git", args, { encoding: "utf8" }));
  const exists = options.exists ?? fs.existsSync;
  const since = "30 days ago";

  const datasetFiles = outputLines(runGit([
    "log",
    `--since=${since}`,
    "-G",
    "^(url:|license_url:)",
    "--name-only",
    "--pretty=format:",
    "--",
    "data/datasets",
  ])).filter((file) =>
    file.startsWith("data/datasets/") &&
    file.endsWith(".yaml") &&
    !file.split("/").at(-1)!.startsWith("_") &&
    exists(file),
  );

  const contractPath = "src/lib/provider-contracts.ts";
  const contractChanged = outputLines(runGit([
    "log",
    "-1",
    `--since=${since}`,
    "--format=%H",
    "--",
    contractPath,
  ])).length > 0;

  return [...new Set([
    ...datasetFiles,
    ...(contractChanged ? [contractPath] : []),
  ])].sort();
}
