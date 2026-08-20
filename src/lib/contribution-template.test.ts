import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { listDatasetFiles } from "./datasets";
import {
  CONTRIBUTION_TEMPLATE_PATH,
  loadContributionTemplate,
} from "./contribution-template";

describe("contribution template", () => {
  it("loads the canonical placeholder file and keeps it out of the catalog", () => {
    const fromDisk = fs.readFileSync(CONTRIBUTION_TEMPLATE_PATH, "utf8");
    const loaded = loadContributionTemplate();
    expect(loaded).toBe(fromDisk);
    expect(loaded).toContain("id: replace-with-dataset-id");
    expect(loaded).toContain("last_verified: YYYY-MM-DD");
    expect(listDatasetFiles()).not.toContain("_template.yaml");
  });
});
