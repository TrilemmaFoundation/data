import Fuse from "fuse.js";
import type { CatalogDataset } from "./schema";
import {
  SIZE_CATEGORIES,
  sizeOverlapsCategory,
  type SizeCategory,
} from "./size";

export type DatasetFilters = {
  query: string;
  domains: string[];
  dataTypes: string[];
  tasks: string[];
  difficulties: string[];
  sizes: SizeCategory[];
  formats: string[];
  apiKeyRequired: boolean | null;
  geographies: string[];
};

export const EMPTY_FILTERS: DatasetFilters = {
  query: "",
  domains: [],
  dataTypes: [],
  tasks: [],
  difficulties: [],
  sizes: [],
  formats: [],
  apiKeyRequired: null,
  geographies: [],
};

export type FilterOptions = {
  domains: string[];
  dataTypes: string[];
  tasks: string[];
  difficulties: string[];
  sizes: SizeCategory[];
  formats: string[];
  geographies: string[];
};

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export function getFilterOptions(datasets: CatalogDataset[]): FilterOptions {
  return {
    domains: uniqueSorted(datasets.flatMap((d) => d.domains)),
    dataTypes: uniqueSorted(datasets.flatMap((d) => d.data_types)),
    tasks: uniqueSorted(datasets.flatMap((d) => d.tasks)),
    difficulties: uniqueSorted(datasets.map((d) => d.difficulty)),
    sizes: [...SIZE_CATEGORIES],
    formats: uniqueSorted(datasets.flatMap((d) => d.formats)),
    geographies: uniqueSorted(datasets.flatMap((d) => d.geography)),
  };
}

function matchesAny(selected: string[], values: string[]): boolean {
  if (selected.length === 0) return true;
  return selected.some((item) => values.includes(item));
}

export function filterDatasets(
  datasets: CatalogDataset[],
  filters: DatasetFilters,
): CatalogDataset[] {
  let results = datasets;

  if (filters.query.trim()) {
    const fuse = new Fuse(datasets, {
      keys: [
        "name",
        "description",
        "provider",
        "domains",
        "tasks",
        "data_types",
        "formats",
      ],
      threshold: 0.35,
      ignoreLocation: true,
    });
    results = fuse.search(filters.query.trim()).map((hit) => hit.item);
  }

  return results.filter((dataset) => {
    if (!matchesAny(filters.domains, dataset.domains)) return false;
    if (!matchesAny(filters.dataTypes, dataset.data_types)) return false;
    if (!matchesAny(filters.tasks, dataset.tasks)) return false;
    if (!matchesAny(filters.difficulties, [dataset.difficulty])) return false;
    if (!matchesAny(filters.formats, dataset.formats)) return false;
    if (!matchesAny(filters.geographies, dataset.geography)) return false;

    if (filters.sizes.length > 0) {
      const overlaps = filters.sizes.some((size) =>
        sizeOverlapsCategory(dataset.size_gb_min, dataset.size_gb_max, size),
      );
      if (!overlaps) return false;
    }

    if (
      filters.apiKeyRequired !== null &&
      dataset.api_key_required !== filters.apiKeyRequired
    ) {
      return false;
    }

    return true;
  });
}
