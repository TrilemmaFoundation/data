import fs from "node:fs";
import path from "node:path";

export const CONTRIBUTION_TEMPLATE_PATH = path.join(
  process.cwd(),
  "data",
  "datasets",
  "_template.yaml",
);

export function loadContributionTemplate(): string {
  return fs.readFileSync(CONTRIBUTION_TEMPLATE_PATH, "utf8");
}
