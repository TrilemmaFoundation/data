import { EMPTY_FILTERS, type CatalogSort, type DatasetFilters } from "./search";
import { filtersToParams } from "./filter-params";

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
