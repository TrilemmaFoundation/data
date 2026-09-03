export type VocabularyKind = "domains" | "tasks";

export type VocabularySnapshot = {
  aliases: Record<VocabularyKind, Record<string, string>>;
  filterable: Record<VocabularyKind, string[]>;
};

export const EMPTY_VOCABULARY_SNAPSHOT: VocabularySnapshot = {
  aliases: { domains: {}, tasks: {} },
  filterable: { domains: [], tasks: [] },
};

export function snapshotKey(value: string): string {
  return value.toLocaleLowerCase("en-US");
}

export function resolveSnapshotAlias(
  snapshot: VocabularySnapshot,
  kind: VocabularyKind,
  value: string,
): string | null {
  const aliases = snapshot.aliases[kind];
  const key = snapshotKey(value);
  return Object.hasOwn(aliases, key) ? aliases[key] ?? null : null;
}

export function canonicalizeSnapshotValue(
  snapshot: VocabularySnapshot,
  kind: VocabularyKind,
  value: string,
): string {
  return resolveSnapshotAlias(snapshot, kind, value) ?? value;
}

export function snapshotHasTerms(snapshot: VocabularySnapshot): boolean {
  return (
    Object.keys(snapshot.aliases.domains).length > 0 ||
    Object.keys(snapshot.aliases.tasks).length > 0
  );
}

export function validateSnapshotCoverage(
  values: { domains: string[]; tasks: string[] },
  snapshot: VocabularySnapshot,
): string[] {
  if (!snapshotHasTerms(snapshot)) return [];
  const messages: string[] = [];
  values.domains.forEach((value, index) => {
    if (!resolveSnapshotAlias(snapshot, "domains", value)) {
      messages.push(`domains[${index}] "${value}" is not in the catalog vocabulary`);
    }
  });
  values.tasks.forEach((value, index) => {
    if (!resolveSnapshotAlias(snapshot, "tasks", value)) {
      messages.push(`tasks[${index}] "${value}" is not in the catalog vocabulary`);
    }
  });
  return messages;
}
