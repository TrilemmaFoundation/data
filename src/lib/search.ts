import Fuse from "fuse.js";
import {
  type CatalogDataset,
  type Dataset,
  type DatasetTheme,
} from "./schema";
import {
  SIZE_CATEGORIES,
  sizeOverlapsCategory,
  type SizeCategory,
} from "./size";

const ACCESS_METHODS = ["api", "download"] as const;
export type AccessMethod = (typeof ACCESS_METHODS)[number];

export const SORT_COLUMNS = [
  "name",
  "theme",
  "access",
  "difficulty",
  "updates",
] as const;
export type SortColumn = (typeof SORT_COLUMNS)[number];
export type CatalogSort = { id: SortColumn; desc: boolean } | null;

export const CATALOG_PAGE_SIZE = 10;

export function paginate<T>(items: T[], requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / CATALOG_PAGE_SIZE));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  const offset = (page - 1) * CATALOG_PAGE_SIZE;
  const pageItems = items.slice(offset, offset + CATALOG_PAGE_SIZE);
  return {
    items: pageItems,
    page,
    totalPages,
    start: pageItems.length === 0 ? 0 : offset + 1,
    end: offset + pageItems.length,
  };
}

export type DatasetFilters = {
  query: string;
  theme: DatasetTheme | null;
  accessMethod: AccessMethod | null;
  difficulty: Dataset["difficulty"] | null;
  domains: string[];
  dataTypes: string[];
  tasks: string[];
  sizes: SizeCategory[];
  formats: string[];
  apiKeyRequired: boolean | null;
  geographies: string[];
};

export const EMPTY_FILTERS: DatasetFilters = {
  query: "",
  theme: null,
  accessMethod: null,
  difficulty: null,
  domains: [],
  dataTypes: [],
  tasks: [],
  sizes: [],
  formats: [],
  apiKeyRequired: null,
  geographies: [],
};

export type FilterOptions = {
  themes: DatasetTheme[];
  accessMethods: AccessMethod[];
  domains: string[];
  dataTypes: string[];
  tasks: string[];
  difficulties: Dataset["difficulty"][];
  sizes: SizeCategory[];
  formats: string[];
  geographies: string[];
};

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export function getDatasetAccessMethods(dataset: CatalogDataset): AccessMethod[] {
  if (dataset.access_type.includes("both")) return [...ACCESS_METHODS];
  return ACCESS_METHODS.filter((method) => dataset.access_type.includes(method));
}

export function getFilterOptions(datasets: CatalogDataset[]): FilterOptions {
  return {
    themes: uniqueSorted(datasets.map((dataset) => dataset.theme)) as DatasetTheme[],
    accessMethods: ACCESS_METHODS.filter((method) =>
      datasets.some((dataset) => getDatasetAccessMethods(dataset).includes(method)),
    ),
    domains: uniqueSorted(datasets.flatMap((d) => d.domains)),
    dataTypes: uniqueSorted(datasets.flatMap((d) => d.data_types)),
    tasks: uniqueSorted(datasets.flatMap((d) => d.tasks)),
    difficulties: uniqueSorted(
      datasets.map((d) => d.difficulty),
    ) as Dataset["difficulty"][],
    sizes: [...SIZE_CATEGORIES],
    formats: uniqueSorted(datasets.flatMap((d) => d.formats)),
    geographies: uniqueSorted(datasets.flatMap((d) => d.geography)),
  };
}

function matchesAny(selected: string[], values: string[]): boolean {
  return selected.length === 0 || selected.some((item) => values.includes(item));
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
        "theme",
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
    if (filters.theme !== null && dataset.theme !== filters.theme) return false;
    if (
      filters.accessMethod !== null &&
      !getDatasetAccessMethods(dataset).includes(filters.accessMethod)
    ) return false;
    if (filters.difficulty !== null && dataset.difficulty !== filters.difficulty) {
      return false;
    }
    if (!matchesAny(filters.domains, dataset.domains)) return false;
    if (!matchesAny(filters.dataTypes, dataset.data_types)) return false;
    if (!matchesAny(filters.tasks, dataset.tasks)) return false;
    if (!matchesAny(filters.formats, dataset.formats)) return false;
    if (!matchesAny(filters.geographies, dataset.geography)) return false;

    if (
      filters.sizes.length > 0 &&
      !filters.sizes.some((size) =>
        sizeOverlapsCategory(dataset.size_gb_min, dataset.size_gb_max, size),
      )
    ) return false;

    return filters.apiKeyRequired === null ||
      dataset.api_key_required === filters.apiKeyRequired;
  });
}

const DIFFICULTY_ORDER: Dataset["difficulty"][] = [
  "beginner",
  "intermediate",
  "advanced",
];
const UPDATE_ORDER: Dataset["update_frequency"][] = [
  "continuous",
  "near real time",
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "annual",
  "occasional",
];

export function compareDatasets(
  a: CatalogDataset,
  b: CatalogDataset,
  column: SortColumn,
): number {
  const compared = column === "name"
    ? a.name.localeCompare(b.name)
    : column === "theme"
      ? a.theme.localeCompare(b.theme)
      : column === "access"
        ? getDatasetAccessMethods(a).join("+").localeCompare(
            getDatasetAccessMethods(b).join("+"),
          )
        : column === "difficulty"
          ? DIFFICULTY_ORDER.indexOf(a.difficulty) -
            DIFFICULTY_ORDER.indexOf(b.difficulty)
          : UPDATE_ORDER.indexOf(a.update_frequency) -
            UPDATE_ORDER.indexOf(b.update_frequency);
  return compared || a.name.localeCompare(b.name);
}

export function sortDatasets(
  datasets: CatalogDataset[],
  sort: CatalogSort,
): CatalogDataset[] {
  if (!sort) return datasets;
  const direction = sort.desc ? -1 : 1;
  return [...datasets].sort(
    (a, b) => compareDatasets(a, b, sort.id) * direction,
  );
}
