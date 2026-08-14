"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { CatalogDataset } from "@/lib/schema";
import { reconcileFilterChange } from "@/lib/catalog-chips";
import {
  filterDatasets,
  getFilterOptions,
  paginate,
  type CatalogSort,
  type DatasetFilters as Filters,
} from "@/lib/search";
import {
  catalogSearchFromLocation,
  filtersToParams,
  isCanonicalPage,
  searchStringToCatalogState,
} from "@/lib/filter-params";
import { CatalogView } from "@/components/CatalogView";

export function DiscoveryView({ datasets }: { datasets: CatalogDataset[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const filterOptions = useMemo(() => getFilterOptions(datasets), [datasets]);
  const [locationSearch, setLocationSearch] = useState("");
  const { filters, sort, page: requestedPage } = useMemo(
    () => searchStringToCatalogState(locationSearch, filterOptions),
    [filterOptions, locationSearch],
  );
  const filtersRef = useRef(filters);
  const sortRef = useRef<CatalogSort>(sort);
  const locationSearchRef = useRef(locationSearch);
  const searchUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsTitleRef = useRef<HTMLHeadingElement>(null);

  const updateState = useCallback(
    (nextFilters: Filters, nextSort: CatalogSort, nextPage = 1, push = false) => {
      filtersRef.current = nextFilters;
      sortRef.current = nextSort;
      const canonicalPage = paginate(
        filterDatasets(datasets, nextFilters),
        nextPage,
      ).page;
      const query = filtersToParams(nextFilters, nextSort, canonicalPage).toString();
      const nextSearch = query ? `?${query}` : "";
      locationSearchRef.current = nextSearch;
      setLocationSearch(nextSearch);
      router[push ? "push" : "replace"](
        query ? `${pathname}?${query}` : pathname,
        { scroll: false },
      );
    },
    [datasets, pathname, router],
  );

  useEffect(() => {
    filtersRef.current = filters;
    sortRef.current = sort;
  }, [filters, sort]);

  useEffect(() => () => {
    if (searchUpdateRef.current) clearTimeout(searchUpdateRef.current);
  }, []);

  useEffect(() => {
    const applyLocation = () => {
      const nextSearch = catalogSearchFromLocation(
        pathname,
        window.location.pathname,
        window.location.search,
      );
      if (nextSearch === null || nextSearch === locationSearchRef.current) return;
      if (searchUpdateRef.current) clearTimeout(searchUpdateRef.current);
      searchUpdateRef.current = null;
      const state = searchStringToCatalogState(nextSearch, filterOptions);
      const canonicalPage = paginate(
        filterDatasets(datasets, state.filters),
        state.page,
      ).page;
      if (searchRef.current) {
        searchRef.current.value = state.filters.query;
      }
      if (!isCanonicalPage(state.params, canonicalPage)) {
        updateState(state.filters, state.sort, canonicalPage);
        return;
      }
      locationSearchRef.current = nextSearch;
      setLocationSearch(nextSearch);
    };
    applyLocation();
    window.addEventListener("popstate", applyLocation);
    const history = window.history;
    const pushState = history.pushState.bind(history);
    const replaceState = history.replaceState.bind(history);
    history.pushState = (...args: Parameters<History["pushState"]>) => {
      pushState(...args);
      applyLocation();
    };
    history.replaceState = (...args: Parameters<History["replaceState"]>) => {
      replaceState(...args);
      applyLocation();
    };
    return () => {
      window.removeEventListener("popstate", applyLocation);
      history.pushState = pushState;
      history.replaceState = replaceState;
    };
  }, [datasets, filterOptions, pathname, updateState]);

  const handleChange = useCallback(
    (next: Filters) => {
      if (searchUpdateRef.current) clearTimeout(searchUpdateRef.current);
      searchUpdateRef.current = null;
      const synchronized = reconcileFilterChange(filters, next, filtersRef.current);
      if (searchRef.current) searchRef.current.value = synchronized.query;
      updateState(synchronized, sortRef.current);
    },
    [filters, updateState],
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      filtersRef.current = { ...filtersRef.current, query };
      if (searchUpdateRef.current) clearTimeout(searchUpdateRef.current);
      searchUpdateRef.current = setTimeout(() => {
        searchUpdateRef.current = null;
        updateState(filtersRef.current, sortRef.current);
      }, 150);
    },
    [updateState],
  );

  const handleSortChange = useCallback(
    (next: CatalogSort) => updateState(filtersRef.current, next),
    [updateState],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      updateState(filtersRef.current, sortRef.current, page, true);
      resultsTitleRef.current?.focus({ preventScroll: true });
    },
    [updateState],
  );

  return (
    <CatalogView
      datasets={datasets}
      filters={filters}
      sort={sort}
      requestedPage={requestedPage}
      searchInputRef={searchRef}
      resultsTitleRef={resultsTitleRef}
      onFiltersChange={handleChange}
      onSearchChange={handleSearchChange}
      onSortChange={handleSortChange}
      onPageChange={handlePageChange}
    />
  );
}
