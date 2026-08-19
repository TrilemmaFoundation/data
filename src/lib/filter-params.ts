import type { DatasetFilters, FilterOptions } from "./search";
import {
  catalogValueKey,
  SORT_COLUMNS,
  type CatalogSort,
} from "./search";
import {
  SIZE_CATEGORIES,
  type SizeCategory,
} from "./size";
import {
  EMPTY_VOCABULARY_SNAPSHOT,
  resolveSnapshotAlias,
  type VocabularyKind,
  type VocabularySnapshot,
} from "./vocabulary-snapshot";

function parseList(
  values: string[],
  allowed: readonly string[],
  snapshot: VocabularySnapshot,
  kind?: VocabularyKind,
): string[] {
  const allowedByKey = new Map(
    allowed.map((item) => [catalogValueKey(item), item] as const),
  );
  const selected = new Set<string>();
  const consider = (raw: string) => {
    const exact = allowedByKey.get(catalogValueKey(raw));
    if (exact) {
      selected.add(exact);
      return;
    }
    if (!kind) return;
    const canonical = resolveSnapshotAlias(snapshot, kind, raw);
    if (canonical && allowedByKey.has(catalogValueKey(canonical))) {
      selected.add(allowedByKey.get(catalogValueKey(canonical))!);
    }
  };
  for (const value of values) {
    consider(value);
    for (const part of value.split(",").map((item) => item.trim()).filter(Boolean)) {
      consider(part);
    }
  }
  return allowed.filter((item) => selected.has(item));
}

function parseSingle<T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | null {
  return value !== null && allowed.includes(value as T) ? value as T : null;
}

function appendList(params: URLSearchParams, key: string, values: string[]) {
  for (const value of values) params.append(key, value);
}

export function parseFilters(
  params: URLSearchParams,
  options: FilterOptions,
  snapshot: VocabularySnapshot = EMPTY_VOCABULARY_SNAPSHOT,
): DatasetFilters {
  const apiKey = params.get("apiKey");
  const sizes = parseList(params.getAll("size"), SIZE_CATEGORIES, snapshot) as SizeCategory[];

  return {
    query: (params.get("q") ?? "").trim(),
    theme: parseSingle(params.get("theme"), options.themes),
    accessMethod: parseSingle(params.get("access"), options.accessMethods),
    difficulty: parseSingle(params.get("difficulty"), options.difficulties),
    domains: parseList(params.getAll("domain"), options.domains, snapshot, "domains"),
    dataTypes: parseList(params.getAll("dataType"), options.dataTypes, snapshot),
    tasks: parseList(params.getAll("task"), options.tasks, snapshot, "tasks"),
    sizes,
    formats: parseList(params.getAll("format"), options.formats, snapshot),
    apiKeyRequired:
      apiKey === "true" ? true : apiKey === "false" ? false : null,
    geographies: parseList(params.getAll("geography"), options.geographies, snapshot),
  };
}

export function parseSort(params: URLSearchParams): CatalogSort {
  const id = params.get("sort");
  const order = params.get("order");
  if (
    !SORT_COLUMNS.includes(id as (typeof SORT_COLUMNS)[number]) ||
    (order !== null && order !== "asc" && order !== "desc")
  ) return null;
  return { id: id as (typeof SORT_COLUMNS)[number], desc: order === "desc" };
}

export function parsePage(params: URLSearchParams): number {
  const values = params.getAll("page");
  if (values.length !== 1 || !/^[1-9]\d*$/.test(values[0]!)) return 1;
  const page = Number(values[0]);
  return Number.isSafeInteger(page) ? page : 1;
}

export function searchStringToCatalogState(
  search: string,
  options: FilterOptions,
  snapshot: VocabularySnapshot = EMPTY_VOCABULARY_SNAPSHOT,
) {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  return {
    params,
    filters: parseFilters(params, options, snapshot),
    sort: parseSort(params),
    page: parsePage(params),
  };
}

export function isCanonicalPage(
  params: URLSearchParams,
  paginatedPage: number,
): boolean {
  const pageValues = params.getAll("page");
  return paginatedPage === 1
    ? pageValues.length === 0
    : pageValues.length === 1 && pageValues[0] === String(paginatedPage);
}

export function catalogSearchFromLocation(
  pagePathname: string,
  locationPathname: string,
  locationSearch: string,
): string | null {
  const page = pagePathname.replace(/\/+$/, "") || "/";
  const current = locationPathname.replace(/\/+$/, "") || "/";
  return page === current ? locationSearch : null;
}

export function filtersToParams(
  filters: DatasetFilters,
  sort: CatalogSort = null,
  page = 1,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query);
  if (filters.theme) params.set("theme", filters.theme);
  if (filters.accessMethod) params.set("access", filters.accessMethod);
  if (filters.difficulty) params.set("difficulty", filters.difficulty);
  appendList(params, "domain", filters.domains);
  appendList(params, "dataType", filters.dataTypes);
  appendList(params, "task", filters.tasks);
  appendList(params, "size", filters.sizes);
  appendList(params, "format", filters.formats);
  if (filters.apiKeyRequired !== null) params.set("apiKey", String(filters.apiKeyRequired));
  appendList(params, "geography", filters.geographies);
  if (sort) {
    params.set("sort", sort.id);
    params.set("order", sort.desc ? "desc" : "asc");
  }
  if (page > 1) params.set("page", String(page));
  return params;
}
