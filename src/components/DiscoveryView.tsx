"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { CatalogDataset } from "@/lib/schema";
import { reconcileFilterChange } from "@/lib/catalog-chips";
import {
  deriveCatalogPage,
  getFilterOptions,
  type CatalogSort,
  type DatasetFilters as Filters,
} from "@/lib/search";
import {
  catalogSearchFromLocation,
  filtersToParams,
  isCanonicalPage,
  searchStringToCatalogState,
} from "@/lib/filter-params";
import type { VocabularySnapshot } from "@/lib/vocabulary-snapshot";
import { CatalogView } from "@/components/CatalogView";
import type { CollectionCardModel } from "@/components/BuildPathCards";

export function DiscoveryView({
  datasets,
  collections,
  starterIds,
  trustSummary,
  vocabulary,
}: {
  datasets: CatalogDataset[];
  collections: CollectionCardModel[];
  starterIds: string[];
  trustSummary: string;
  vocabulary: VocabularySnapshot;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const filterOptions = useMemo(
    () => getFilterOptions(datasets, vocabulary),
    [datasets, vocabulary],
  );
  const [locationSearch, setLocationSearch] = useState("");
  const { filters, sort, page: requestedPage } = useMemo(
    () => searchStringToCatalogState(locationSearch, filterOptions, vocabulary),
    [filterOptions, locationSearch, vocabulary],
  );
  const filtersRef = useRef(filters);
  const sortRef = useRef<CatalogSort>(sort);
  const locationSearchRef = useRef(locationSearch);
  const pendingSearchRef = useRef<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsTitleRef = useRef<HTMLHeadingElement>(null);

  const updateState = useCallback(
    (nextFilters: Filters, nextSort: CatalogSort, nextPage = 1, push = false) => {
      filtersRef.current = nextFilters;
      sortRef.current = nextSort;
      const canonicalPage = deriveCatalogPage(
        datasets,
        nextFilters,
        nextSort,
        nextPage,
        vocabulary,
      ).paginated.page;
      const query = filtersToParams(nextFilters, nextSort, canonicalPage).toString();
      const nextSearch = query ? `?${query}` : "";
      locationSearchRef.current = nextSearch;
      pendingSearchRef.current = nextSearch;
      setLocationSearch(nextSearch);
      router[push ? "push" : "replace"](
        query ? `${pathname}?${query}` : pathname,
        { scroll: false },
      );
    },
    [datasets, pathname, router, vocabulary],
  );

  useEffect(() => {
    filtersRef.current = filters;
    sortRef.current = sort;
  }, [filters, sort]);

  useEffect(() => {
    const applyLocation = (source: "init" | "history" | "popstate") => {
      const nextSearch = catalogSearchFromLocation(
        pathname,
        window.location.pathname,
        window.location.search,
      );
      if (nextSearch === null) return;
      if (source === "popstate") {
        pendingSearchRef.current = null;
      } else if (pendingSearchRef.current !== null) {
        if (nextSearch === pendingSearchRef.current) pendingSearchRef.current = null;
        return;
      }
      if (nextSearch === locationSearchRef.current) return;
      const state = searchStringToCatalogState(nextSearch, filterOptions, vocabulary);
      const canonicalPage = deriveCatalogPage(
        datasets,
        state.filters,
        state.sort,
        state.page,
        vocabulary,
      ).paginated.page;
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
    applyLocation("init");
    const onPopState = () => applyLocation("popstate");
    window.addEventListener("popstate", onPopState);
    const history = window.history;
    history.scrollRestoration = "manual";
    const pushState = history.pushState.bind(history);
    history.pushState = (...args: Parameters<History["pushState"]>) => {
      pushState(...args);
      applyLocation("history");
    };
    return () => {
      window.removeEventListener("popstate", onPopState);
      history.pushState = pushState;
    };
  }, [datasets, filterOptions, pathname, updateState, vocabulary]);

  const handleChange = useCallback(
    (next: Filters) => {
      const synchronized = reconcileFilterChange(filters, next, filtersRef.current);
      if (searchRef.current) searchRef.current.value = synchronized.query;
      updateState(synchronized, sortRef.current);
    },
    [filters, updateState],
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      const nextFilters = { ...filtersRef.current, query };
      filtersRef.current = nextFilters;
      const encoded = filtersToParams(nextFilters, sortRef.current, 1).toString();
      const nextSearch = encoded ? `?${encoded}` : "";
      locationSearchRef.current = nextSearch;
      pendingSearchRef.current = nextSearch;
      setLocationSearch(nextSearch);
      window.history.replaceState(
        window.history.state,
        "",
        nextSearch ? `${pathname}${nextSearch}` : pathname,
      );
    },
    [pathname],
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

  const { results, paginated } = useMemo(
    () => deriveCatalogPage(datasets, filters, sort, requestedPage, vocabulary),
    [datasets, filters, requestedPage, sort, vocabulary],
  );

  return (
    <CatalogView
      collections={collections}
      starterIds={starterIds}
      trustSummary={trustSummary}
      filterOptions={filterOptions}
      filters={filters}
      results={results}
      paginated={paginated}
      sort={sort}
      searchInputRef={searchRef}
      resultsTitleRef={resultsTitleRef}
      onFiltersChange={handleChange}
      onSearchChange={handleSearchChange}
      onSortChange={handleSortChange}
      onPageChange={handlePageChange}
    />
  );
}
