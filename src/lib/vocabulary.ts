import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { uniqueStrings } from "./schema";
import {
  snapshotKey,
  type VocabularyKind,
  type VocabularySnapshot,
} from "./vocabulary-snapshot";

const VOCABULARY_PATH = path.join(process.cwd(), "data", "vocabulary.yaml");

const TermSchema = z.strictObject({
  label: z.string().trim().min(1).max(100),
  filterable: z.boolean(),
  aliases: uniqueStrings(0, 80),
});

const VocabularyFileSchema = z.strictObject({
  domains: z.array(TermSchema).min(1).max(80),
  tasks: z.array(TermSchema).min(1).max(80),
});

export type { VocabularyKind } from "./vocabulary-snapshot";
export type VocabularyTerm = z.infer<typeof TermSchema>;
export type Vocabulary = {
  domains: VocabularyTerm[];
  tasks: VocabularyTerm[];
  resolve: (kind: VocabularyKind, value: string) => string | null;
  canonicalize: (kind: VocabularyKind, value: string) => string;
  keywordsFor: (kind: VocabularyKind, values: string[]) => string[];
  filterableLabels: (kind: VocabularyKind) => string[];
  allLabels: (kind: VocabularyKind) => string[];
};

type Index = {
  byKey: Map<string, string>;
  aliasesByLabel: Map<string, string[]>;
  filterable: string[];
  labels: string[];
};

let cached: Vocabulary | null = null;

function catalogKey(value: string): string {
  return value.toLocaleLowerCase("en-US");
}

function buildIndex(terms: VocabularyTerm[], kind: VocabularyKind): {
  index: Index;
  errors: string[];
} {
  const errors: string[] = [];
  const byKey = new Map<string, string>();
  const aliasesByLabel = new Map<string, string[]>();
  const filterable: string[] = [];
  const labels: string[] = [];

  for (const [position, term] of terms.entries()) {
    const labelKey = catalogKey(term.label);
    if (byKey.has(labelKey)) {
      errors.push(`${kind}[${position}].label duplicates "${byKey.get(labelKey)}"`);
      continue;
    }
    byKey.set(labelKey, term.label);
    labels.push(term.label);
    aliasesByLabel.set(term.label, term.aliases);
    if (term.filterable) filterable.push(term.label);

    for (const [aliasIndex, alias] of term.aliases.entries()) {
      const aliasKey = catalogKey(alias);
      if (aliasKey === labelKey) {
        errors.push(
          `${kind}[${position}].aliases[${aliasIndex}] repeats the canonical label`,
        );
        continue;
      }
      const existing = byKey.get(aliasKey);
      if (existing) {
        errors.push(
          `${kind} alias "${alias}" collides with "${existing}"`,
        );
        continue;
      }
      byKey.set(aliasKey, term.label);
    }
  }

  return {
    index: { byKey, aliasesByLabel, filterable, labels },
    errors,
  };
}

export function parseVocabulary(raw: unknown): {
  vocabulary: Vocabulary | null;
  errors: string[];
} {
  const parsed = VocabularyFileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      vocabulary: null,
      errors: parsed.error.issues.map((issue) => {
        const where = issue.path.length ? issue.path.join(".") : "(root)";
        return `${where}: ${issue.message}`;
      }),
    };
  }

  const domains = buildIndex(parsed.data.domains, "domains");
  const tasks = buildIndex(parsed.data.tasks, "tasks");
  const errors = [...domains.errors, ...tasks.errors];
  if (errors.length > 0) return { vocabulary: null, errors };

  const indexes = { domains: domains.index, tasks: tasks.index };

  const resolve = (kind: VocabularyKind, value: string): string | null =>
    indexes[kind].byKey.get(catalogKey(value)) ?? null;

  const canonicalize = (kind: VocabularyKind, value: string): string =>
    resolve(kind, value) ?? value;

  const keywordsFor = (kind: VocabularyKind, values: string[]): string[] => {
    const keywords: string[] = [];
    const seen = new Set<string>();
    for (const value of values) {
      const label = canonicalize(kind, value);
      const extras = [label, ...(indexes[kind].aliasesByLabel.get(label) ?? [])];
      for (const extra of extras) {
        const key = catalogKey(extra);
        if (seen.has(key)) continue;
        seen.add(key);
        keywords.push(extra);
      }
    }
    return keywords;
  };

  return {
    vocabulary: {
      domains: parsed.data.domains,
      tasks: parsed.data.tasks,
      resolve,
      canonicalize,
      keywordsFor,
      filterableLabels: (kind) => indexes[kind].filterable,
      allLabels: (kind) => indexes[kind].labels,
    },
    errors: [],
  };
}

export function loadVocabulary(filePath: string = VOCABULARY_PATH): {
  vocabulary: Vocabulary | null;
  errors: string[];
} {
  if (filePath === VOCABULARY_PATH && cached && process.env.NODE_ENV !== "development") {
    return { vocabulary: cached, errors: [] };
  }

  if (!fs.existsSync(filePath)) {
    return { vocabulary: null, errors: [`${filePath} does not exist`] };
  }

  let raw: unknown;
  try {
    raw = parseYaml(fs.readFileSync(filePath, "utf8"), { maxAliasCount: 50 });
  } catch (error) {
    return {
      vocabulary: null,
      errors: [
        `YAML parse error: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }

  const result = parseVocabulary(raw);
  if (result.vocabulary && filePath === VOCABULARY_PATH && process.env.NODE_ENV !== "development") {
    cached = result.vocabulary;
  }
  return result;
}

export function getVocabulary(filePath: string = VOCABULARY_PATH): Vocabulary {
  const { vocabulary, errors } = loadVocabulary(filePath);
  if (!vocabulary) {
    throw new Error(`Invalid vocabulary:\n${errors.map((error) => `  - ${error}`).join("\n")}`);
  }
  return vocabulary;
}

export function toVocabularySnapshot(vocabulary: Vocabulary): VocabularySnapshot {
  const aliases: VocabularySnapshot["aliases"] = { domains: {}, tasks: {} };
  for (const kind of ["domains", "tasks"] as const) {
    for (const term of vocabulary[kind]) {
      aliases[kind][snapshotKey(term.label)] = term.label;
      for (const alias of term.aliases) {
        aliases[kind][snapshotKey(alias)] = term.label;
      }
    }
  }
  return {
    aliases,
    filterable: {
      domains: vocabulary.filterableLabels("domains"),
      tasks: vocabulary.filterableLabels("tasks"),
    },
  };
}

export function clearVocabularyCacheForTests(): void {
  cached = null;
}

export function validateVocabularyCoverage(
  values: { domains: string[]; tasks: string[] },
  vocabulary: Vocabulary,
): string[] {
  const messages: string[] = [];
  values.domains.forEach((value, index) => {
    if (!vocabulary.resolve("domains", value)) {
      messages.push(`domains[${index}] "${value}" is not in the catalog vocabulary`);
    }
  });
  values.tasks.forEach((value, index) => {
    if (!vocabulary.resolve("tasks", value)) {
      messages.push(`tasks[${index}] "${value}" is not in the catalog vocabulary`);
    }
  });
  return messages;
}
