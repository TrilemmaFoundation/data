export const SHORTLIST_STORAGE_KEY = "trilemma-data-shortlist";
export const SHORTLIST_VERSION = 1;
export const MAX_SHORTLIST = 12;
export const MAX_COMPARE = 3;

type ShortlistPayload = {
  version: number;
  ids: string[];
};

export function parseShortlist(
  raw: string | null | undefined,
  knownIds: ReadonlySet<string>,
): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ShortlistPayload;
    if (parsed.version !== SHORTLIST_VERSION || !Array.isArray(parsed.ids)) {
      return [];
    }
    const selected: string[] = [];
    const seen = new Set<string>();
    for (const id of parsed.ids) {
      if (typeof id !== "string" || seen.has(id) || !knownIds.has(id)) continue;
      seen.add(id);
      selected.push(id);
      if (selected.length >= MAX_SHORTLIST) break;
    }
    return selected;
  } catch {
    return [];
  }
}

export function serializeShortlist(ids: string[]): string {
  return JSON.stringify({ version: SHORTLIST_VERSION, ids });
}

export function toggleShortlistId(
  ids: string[],
  id: string,
  knownIds: ReadonlySet<string>,
): string[] {
  if (!knownIds.has(id)) return ids;
  if (ids.includes(id)) return ids.filter((item) => item !== id);
  if (ids.length >= MAX_SHORTLIST) return ids;
  return [...ids, id];
}

export function parseCompareIds(
  raw: string | null | undefined,
  knownIds: ReadonlySet<string>,
): string[] {
  if (!raw) return [];
  const selected: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (!id || seen.has(id) || !knownIds.has(id)) continue;
    seen.add(id);
    selected.push(id);
    if (selected.length >= MAX_COMPARE) break;
  }
  return selected;
}

export function compareHref(ids: string[]): string {
  const unique = [...new Set(ids)].slice(0, MAX_COMPARE);
  if (unique.length === 0) return "/compare";
  return `/compare?ids=${unique.map(encodeURIComponent).join(",")}`;
}

export function canCompare(ids: string[]): boolean {
  return ids.length >= 2 && ids.length <= MAX_COMPARE;
}
