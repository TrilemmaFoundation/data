import {
  EMPTY_FILTERS,
  type DatasetFilters,
} from "./search";
import {
  SIZE_CATEGORIES,
  type SizeCategory,
} from "./size";

function parseList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseFilters(params: URLSearchParams): DatasetFilters {
  const apiKey = params.get("apiKey");
  const sizes = parseList(params.get("size")).filter(
    (item): item is SizeCategory =>
      (SIZE_CATEGORIES as readonly string[]).includes(item),
  );

  return {
    query: params.get("q") ?? "",
    domains: parseList(params.get("domain")),
    dataTypes: parseList(params.get("dataType")),
    tasks: parseList(params.get("task")),
    difficulties: parseList(params.get("difficulty")),
    sizes,
    formats: parseList(params.get("format")),
    apiKeyRequired:
      apiKey === "true" ? true : apiKey === "false" ? false : null,
    geographies: parseList(params.get("geography")),
  };
}

export function filtersToParams(filters: DatasetFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
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
