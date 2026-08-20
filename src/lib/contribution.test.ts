import { describe, expect, it } from "vitest";
import { getDatasetById } from "./datasets";
import { parseContributionYaml, stringifyContributionYaml } from "./contribution";
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
