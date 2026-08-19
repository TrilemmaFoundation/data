import { EMPTY_FILTERS, type CatalogSort, type DatasetFilters } from "./search";
import { filtersToParams } from "./filter-params";
import type { DatasetTheme } from "./schema";

export function catalogHref(
  partial: Partial<DatasetFilters> = {},
  sort: CatalogSort = null,
  page = 1,
): string {
  const query = filtersToParams(
    { ...EMPTY_FILTERS, ...partial },
    sort,
    page,
  ).toString();
  return query ? `/?${query}` : "/";
}

export function collectionCatalogHref(themes: readonly (DatasetTheme | undefined)[]): string {
  const unique = [...new Set(themes.filter((theme): theme is DatasetTheme => Boolean(theme)))];
  if (unique.length === 1) return catalogHref({ theme: unique[0] });
  return "/";
}
