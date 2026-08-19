import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { validateGuideCopy } from "./guide-validation";
import { DatasetSchema, type Dataset } from "./schema";
import {
  EMPTY_VOCABULARY_SNAPSHOT,
  validateSnapshotCoverage,
  type VocabularySnapshot,
} from "./vocabulary-snapshot";

export type ContributionIssue = {
  path: string;
  message: string;
};

export function parseContributionYaml(
  text: string,
  snapshot: VocabularySnapshot = EMPTY_VOCABULARY_SNAPSHOT,
): {
  dataset: Dataset | null;
  issues: ContributionIssue[];
} {
  let raw: unknown;
  try {
    raw = parseYaml(text, { maxAliasCount: 50 });
  } catch (error) {
    return {
      dataset: null,
      issues: [
        {
          path: "(root)",
          message: `YAML parse error: ${String(error)}`,
        },
      ],
    };
  }

  const parsed = DatasetSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      dataset: null,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.length ? issue.path.join(".") : "(root)",
        message: issue.message,
      })),
    };
  }

  return {
    dataset: parsed.data,
    issues: [
      ...validateGuideCopy(parsed.data).map((message) => ({
        path: "getting_started",
        message,
      })),
      ...validateSnapshotCoverage(parsed.data, snapshot).map((message) => ({
        path: message.startsWith("tasks") ? "tasks" : "domains",
        message,
      })),
    ],
  };
}

export function stringifyContributionYaml(dataset: Dataset): string {
  return stringifyYaml(dataset, { lineWidth: 88, indent: 2 });
}
