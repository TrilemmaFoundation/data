import type { DatasetFilters, FilterOptions } from "./search";
import {
  SORT_COLUMNS,
  type CatalogSort,
} from "./search";
import {
  SIZE_CATEGORIES,
  type SizeCategory,
} from "./size";

function parseList(values: string[], allowed: readonly string[]): string[] {
  const selected = new Set(
    values.flatMap((value) =>
      allowed.includes(value)
        ? value
        : value.split(",").map((item) => item.trim()).filter(Boolean),
    ),
  );
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
): DatasetFilters {
  const apiKey = params.get("apiKey");
  const sizes = parseList(params.getAll("size"), SIZE_CATEGORIES) as SizeCategory[];

  return {
    query: (params.get("q") ?? "").trim(),
    theme: parseSingle(params.get("theme"), options.themes),
    accessMethod: parseSingle(params.get("access"), options.accessMethods),
    difficulty: parseSingle(params.get("difficulty"), options.difficulties),
    domains: parseList(params.getAll("domain"), options.domains),
    dataTypes: parseList(params.getAll("dataType"), options.dataTypes),
    tasks: parseList(params.getAll("task"), options.tasks),
    sizes,
    formats: parseList(params.getAll("format"), options.formats),
    apiKeyRequired:
      apiKey === "true" ? true : apiKey === "false" ? false : null,
    geographies: parseList(params.getAll("geography"), options.geographies),
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

export function filtersToParams(
  filters: DatasetFilters,
  sort: CatalogSort = null,
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
  return params;
}
