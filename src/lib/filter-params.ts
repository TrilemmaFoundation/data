import {
  EMPTY_FILTERS,
  type DatasetFilters,
  type FilterOptions,
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
    query: params.get("q") ?? "",
    domains: parseList(params.getAll("domain"), options.domains),
    dataTypes: parseList(params.getAll("dataType"), options.dataTypes),
    tasks: parseList(params.getAll("task"), options.tasks),
    difficulties: parseList(params.getAll("difficulty"), options.difficulties),
    sizes,
    formats: parseList(params.getAll("format"), options.formats),
    apiKeyRequired:
      apiKey === "true" ? true : apiKey === "false" ? false : null,
    geographies: parseList(params.getAll("geography"), options.geographies),
  };
}

export function filtersToParams(filters: DatasetFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query);
  appendList(params, "domain", filters.domains);
  appendList(params, "dataType", filters.dataTypes);
  appendList(params, "task", filters.tasks);
  appendList(params, "difficulty", filters.difficulties);
  appendList(params, "size", filters.sizes);
  appendList(params, "format", filters.formats);
  if (filters.apiKeyRequired !== null) params.set("apiKey", String(filters.apiKeyRequired));
  appendList(params, "geography", filters.geographies);
  return params;
}

export type QuickPreset = "beginner" | "small-csv";

export function applyQuickPreset(
  filters: DatasetFilters,
  preset: QuickPreset,
): DatasetFilters {
  if (preset === "beginner") {
    return { ...EMPTY_FILTERS, query: filters.query, difficulties: ["beginner"] };
  }
  return {
    ...EMPTY_FILTERS,
    query: filters.query,
    sizes: ["Tiny", "Small"],
    formats: ["CSV"],
    apiKeyRequired: false,
  };
}
