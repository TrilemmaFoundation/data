import { catalogCopy, filterChipPrefixes, filterCopy } from "@/content/site-copy";
import { EMPTY_FILTERS, type DatasetFilters as Filters } from "./search";

export type ActiveChip = {
  key: string;
  label: string;
  next: Filters;
};

export function activeChips(filters: Filters): ActiveChip[] {
  const chips: ActiveChip[] = [];
  if (filters.query) {
    chips.push({
      key: "query",
      label: `${filterChipPrefixes.query}: ${filters.query}`,
      next: { ...filters, query: "" },
    });
  }
  if (filters.theme) {
    chips.push({
      key: "theme",
      label: `${filterChipPrefixes.theme}: ${filters.theme}`,
      next: { ...filters, theme: null },
    });
  }
  if (filters.accessMethod) {
    const access = filters.accessMethod === "api" ? "API" : "Download";
    chips.push({
      key: "access",
      label: `${filterChipPrefixes.accessMethod}: ${access}`,
      next: { ...filters, accessMethod: null },
    });
  }
  if (filters.difficulty) {
    chips.push({
      key: "difficulty",
      label: `${filterChipPrefixes.difficulty}: ${filters.difficulty}`,
      next: { ...filters, difficulty: null },
    });
  }
  const groups: Array<[keyof Filters, string[], string]> = [
    ["domains", filters.domains, filterChipPrefixes.domains],
    ["dataTypes", filters.dataTypes, filterChipPrefixes.dataTypes],
    ["tasks", filters.tasks, filterChipPrefixes.tasks],
    ["sizes", filters.sizes, filterChipPrefixes.sizes],
    ["formats", filters.formats, filterChipPrefixes.formats],
    ["geographies", filters.geographies, filterChipPrefixes.geographies],
  ];
  for (const [key, values, prefix] of groups) {
    for (const value of values) {
      chips.push({
        key: `${String(key)}-${value}`,
        label: `${prefix}: ${value}`,
        next: { ...filters, [key]: values.filter((item) => item !== value) },
      } as ActiveChip);
    }
  }
  if (filters.apiKeyRequired !== null) {
    chips.push({
      key: "api-key",
      label: filters.apiKeyRequired
        ? filterCopy.apiKeyLabel
        : catalogCopy.noApiKeyChipLabel,
      next: { ...filters, apiKeyRequired: null },
    });
  }
  return chips;
}

export function reconcileFilterChange(
  rendered: Filters,
  next: Filters,
  latest: Filters,
): Filters {
  if (next === EMPTY_FILTERS) return EMPTY_FILTERS;
  return {
    query: next.query !== rendered.query ? next.query : latest.query,
    theme: next.theme !== rendered.theme ? next.theme : latest.theme,
    accessMethod: next.accessMethod !== rendered.accessMethod
      ? next.accessMethod
      : latest.accessMethod,
    difficulty: next.difficulty !== rendered.difficulty
      ? next.difficulty
      : latest.difficulty,
    domains: next.domains !== rendered.domains ? next.domains : latest.domains,
    dataTypes: next.dataTypes !== rendered.dataTypes ? next.dataTypes : latest.dataTypes,
    tasks: next.tasks !== rendered.tasks ? next.tasks : latest.tasks,
    sizes: next.sizes !== rendered.sizes ? next.sizes : latest.sizes,
    formats: next.formats !== rendered.formats ? next.formats : latest.formats,
    apiKeyRequired: next.apiKeyRequired !== rendered.apiKeyRequired
      ? next.apiKeyRequired
      : latest.apiKeyRequired,
    geographies: next.geographies !== rendered.geographies
      ? next.geographies
      : latest.geographies,
  };
}
