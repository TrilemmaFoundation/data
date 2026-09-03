import { describe, expect, it } from "vitest";
import { getDatasetById } from "./datasets";
import {
  contributionEnumValue,
  parseContributionYaml,
  replaceContributionField,
  stringifyContributionYaml,
} from "./contribution";
import { DATASET_THEMES, DIFFICULTIES, MAX_DATASET_FILE_BYTES } from "./schema";
import { getVocabulary, toVocabularySnapshot } from "./vocabulary";

describe("contribution YAML round trip", () => {
  it("parses and regenerates a valid dataset YAML file", () => {
    const dataset = getDatasetById("nws-weather-api")!;
    const yaml = stringifyContributionYaml(dataset);
    const parsed = parseContributionYaml(yaml);
    expect(parsed.issues).toEqual([]);
    expect(parsed.dataset?.id).toBe("nws-weather-api");
    expect(parsed.dataset?.name).toBe(dataset.name);
  });

  it("reports YAML, schema, and guide-copy issues", () => {
    expect(parseContributionYaml("[").issues[0]?.message).toContain("YAML parse error");
    expect(parseContributionYaml("null").issues[0]?.path).toBe("(root)");
    expect(parseContributionYaml("id: not valid").dataset).toBeNull();
    expect(parseContributionYaml("id: not valid").issues.length).toBeGreaterThan(0);

    const dataset = getDatasetById("nws-weather-api")!;
    const invalidCopy = stringifyContributionYaml({
      ...dataset,
      description: "Too short.",
    });
    const copyIssues = parseContributionYaml(invalidCopy);
    expect(copyIssues.dataset?.id).toBe("nws-weather-api");
    expect(copyIssues.issues.some((issue) => issue.path === "getting_started")).toBe(
      true,
    );
  });

  it("reads controlled enum values from the current YAML text", () => {
    const yaml = "theme: Markets & Economics\ndifficulty: advanced\n";
    expect(contributionEnumValue(yaml, "theme", DATASET_THEMES)).toBe(
      "Markets & Economics",
    );
    expect(contributionEnumValue(yaml, "difficulty", DIFFICULTIES)).toBe("advanced");
    expect(contributionEnumValue("theme:   Markets & Economics  \n", "theme", DATASET_THEMES))
      .toBe("Markets & Economics");
    expect(contributionEnumValue('theme: "Markets & Economics"\n', "theme", DATASET_THEMES))
      .toBe("Markets & Economics");
    expect(contributionEnumValue("  theme: Markets & Economics\n", "theme", DATASET_THEMES))
      .toBe("");
    expect(contributionEnumValue("theme: Markets & Economics\n", "theme+", DATASET_THEMES))
      .toBe("");
    expect(contributionEnumValue("theme: Unknown\n", "theme", DATASET_THEMES)).toBe("");
    expect(contributionEnumValue("", "theme", DATASET_THEMES)).toBe("");
  });

  it("replaces or appends controlled YAML fields", () => {
    expect(replaceContributionField("theme: Markets & Economics\n", "theme", "Government & Policy"))
      .toBe("theme: Government & Policy\n");
    expect(replaceContributionField("id: not valid", "theme", "Government & Policy"))
      .toBe("id: not valid\ntheme: Government & Policy\n");
    expect(replaceContributionField("", "difficulty", "beginner")).toBe("difficulty: beginner\n");
  });

  it("rejects oversized and merge-based browser drafts before preview", () => {
    const oversizedMessage = `dataset file exceeds ${MAX_DATASET_FILE_BYTES} bytes`;
    for (const yaml of [
      "x".repeat(MAX_DATASET_FILE_BYTES + 1),
      "é".repeat(MAX_DATASET_FILE_BYTES / 2 + 1),
    ]) {
      expect(parseContributionYaml(yaml)).toEqual({
        dataset: null,
        issues: [{
          path: "(root)",
          message: oversizedMessage,
        }],
      });
    }
    for (const yaml of [
      "x".repeat(MAX_DATASET_FILE_BYTES),
      "é".repeat(MAX_DATASET_FILE_BYTES / 2),
    ]) {
      expect(parseContributionYaml(yaml).issues[0]?.message).not.toBe(oversizedMessage);
    }

    const dataset = getDatasetById("nws-weather-api")!;
    const indented = stringifyContributionYaml(dataset)
      .split("\n")
      .map((line) => (line.length > 0 ? `  ${line}` : line))
      .join("\n");
    const merged = parseContributionYaml(`defaults: &defaults\n${indented}<<: *defaults\n`);
    expect(merged.dataset).toBeNull();
    expect(merged.issues.length).toBeGreaterThan(0);
  });

  it("rejects domain tags that are missing from the vocabulary snapshot", () => {
    const dataset = getDatasetById("nws-weather-api")!;
    const yaml = stringifyContributionYaml({
      ...dataset,
      domains: ["Totally Invented Domain"],
    });
    const snapshot = toVocabularySnapshot(getVocabulary());
    const withoutSnapshot = parseContributionYaml(yaml);
    expect(withoutSnapshot.dataset?.id).toBe("nws-weather-api");
    expect(withoutSnapshot.issues).toEqual([]);

    const withSnapshot = parseContributionYaml(yaml, snapshot);
    expect(withSnapshot.dataset?.id).toBe("nws-weather-api");
    expect(withSnapshot.issues.some((issue) => issue.path === "domains")).toBe(true);
    const invalidTasks = stringifyContributionYaml({
      ...dataset,
      tasks: ["Totally Invented Task"],
    });
    expect(
      parseContributionYaml(invalidTasks, snapshot).issues.some((issue) => issue.path === "tasks"),
    ).toBe(true);
    expect(parseContributionYaml(stringifyContributionYaml(dataset), snapshot).issues).toEqual(
      [],
    );
  });
});
