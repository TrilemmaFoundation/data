import {
  EMPTY_FILTERS,
  type DatasetFilters,
  type FilterOptions,
} from "./search";
import {
  SIZE_CATEGORIES,
  type SizeCategory,
} from "./size";

function parseList(value: string | null, allowed: readonly string[]): string[] {
  if (!value) return [];
  const selected = new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
  return allowed.filter((item) => selected.has(item));
}

export function parseFilters(
  params: URLSearchParams,
  options: FilterOptions,
): DatasetFilters {
  const apiKey = params.get("apiKey");
  const sizes = parseList(params.get("size"), SIZE_CATEGORIES) as SizeCategory[];

  return {
    query: params.get("q") ?? "",
    domains: parseList(params.get("domain"), options.domains),
    dataTypes: parseList(params.get("dataType"), options.dataTypes),
    tasks: parseList(params.get("task"), options.tasks),
    difficulties: parseList(params.get("difficulty"), options.difficulties),
    sizes,
    formats: parseList(params.get("format"), options.formats),
    apiKeyRequired:
      apiKey === "true" ? true : apiKey === "false" ? false : null,
    geographies: parseList(params.get("geography"), options.geographies),
  };
}

export function filtersToParams(filters: DatasetFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query);
  if (filters.domains.length) params.set("domain", filters.domains.join(","));
  if (filters.dataTypes.length) params.set("dataType", filters.dataTypes.join(","));
  if (filters.tasks.length) params.set("task", filters.tasks.join(","));
  if (filters.difficulties.length) params.set("difficulty", filters.difficulties.join(","));
  if (filters.sizes.length) params.set("size", filters.sizes.join(","));
  if (filters.formats.length) params.set("format", filters.formats.join(","));
  if (filters.apiKeyRequired !== null) params.set("apiKey", String(filters.apiKeyRequired));
  if (filters.geographies.length) params.set("geography", filters.geographies.join(","));
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
