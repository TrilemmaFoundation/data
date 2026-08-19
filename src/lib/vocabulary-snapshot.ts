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
  return snapshot.aliases[kind][snapshotKey(value)] ?? null;
}

export function canonicalizeSnapshotValue(
  snapshot: VocabularySnapshot,
  kind: VocabularyKind,
  value: string,
): string {
  return resolveSnapshotAlias(snapshot, kind, value) ?? value;
}
