import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { validateGuideCopy } from "./guide-validation";
import {
  DatasetSchema,
  MAX_DATASET_FILE_BYTES,
  type Dataset,
} from "./schema";
import {
  EMPTY_VOCABULARY_SNAPSHOT,
  validateSnapshotCoverage,
  type VocabularySnapshot,
} from "./vocabulary-snapshot";

export type ContributionIssue = {
  path: string;
  message: string;
};

function fieldLinePattern(field: string): RegExp {
  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escapedField}:\\s*(.*?)[^\\S\\n]*$`, "m");
}

export function contributionEnumValue<T extends string>(
  text: string,
  field: string,
  allowed: readonly T[],
): T | "" {
  const rawValue = fieldLinePattern(field).exec(text)?.[1];
  const value = rawValue?.match(/^(["'])(.*)\1$/)?.[2] ?? rawValue;
  return value && allowed.includes(value as T) ? value as T : "";
}

export function replaceContributionField(
  text: string,
  field: string,
  value: string,
): string {
  const nextLine = `${field}: ${value}`;
  const pattern = fieldLinePattern(field);
  if (pattern.test(text)) return text.replace(pattern, nextLine);
  if (text.length === 0) return `${nextLine}\n`;
  return `${text.replace(/\n?$/, "\n")}${nextLine}\n`;
}

export function parseContributionYaml(
  text: string,
  snapshot: VocabularySnapshot = EMPTY_VOCABULARY_SNAPSHOT,
): {
  dataset: Dataset | null;
  issues: ContributionIssue[];
} {
  if (
    text.length > MAX_DATASET_FILE_BYTES ||
    new TextEncoder().encode(text).byteLength > MAX_DATASET_FILE_BYTES
  ) {
    return {
      dataset: null,
      issues: [{
        path: "(root)",
        message: `dataset file exceeds ${MAX_DATASET_FILE_BYTES} bytes`,
      }],
    };
  }

  let raw: unknown;
  try {
    raw = parseYaml(text, { maxAliasCount: 50, merge: false });
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
