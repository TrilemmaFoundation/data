"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { ArrowDown, Filter, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CatalogDataset } from "@/lib/schema";
import {
  EMPTY_FILTERS,
  filterDatasets,
  getFilterOptions,
  paginate,
  sortDatasets,
  type CatalogSort,
  type DatasetFilters as Filters,
} from "@/lib/search";
import { filtersToParams, parseFilters, parsePage, parseSort } from "@/lib/filter-params";
import { CatalogPagination } from "@/components/CatalogPagination";
import { DatasetCard } from "@/components/DatasetCard";
import { DatasetFilters, DatasetQuickFilters } from "@/components/DatasetFilters";
import { DatasetTable } from "@/components/DatasetTable";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { catalogCopy, filterChipPrefixes, filterCopy } from "@/content/site-copy";

type ActiveChip = {
  key: string;
  label: string;
  next: Filters;
};

function activeChips(filters: Filters): ActiveChip[] {
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

function reconcileFilterChange(
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

export function DiscoveryView({ datasets }: { datasets: CatalogDataset[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filterOptions = useMemo(() => getFilterOptions(datasets), [datasets]);
  const params = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );
  const filters = useMemo(() => parseFilters(params, filterOptions), [filterOptions, params]);
  const sort = useMemo(() => parseSort(params), [params]);
  const requestedPage = useMemo(() => parsePage(params), [params]);
  const filtersRef = useRef(filters);
  const sortRef = useRef<CatalogSort>(sort);
  const searchUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsTitleRef = useRef<HTMLHeadingElement>(null);
  const filterDialogRef = useRef<HTMLDialogElement>(null);
  const activeFilterTriggerRef = useRef<HTMLButtonElement | null>(null);
  const desktopFilterTriggerRef = useRef<HTMLButtonElement>(null);
  const results = useMemo(() => filterDatasets(datasets, filters), [datasets, filters]);
  const chips = useMemo(() => activeChips(filters), [filters]);
  const isUnfiltered = chips.length === 0;
  const displayedResults = useMemo(() => {
    if (!isUnfiltered) return results;
    const recommended = results.find(
      (dataset) => dataset.id === catalogCopy.recommendedDatasetId,
    );
    if (!recommended || results[0] === recommended) return results;
    return [recommended, ...results.filter((dataset) => dataset !== recommended)];
  }, [isUnfiltered, results]);
  const orderedResults = useMemo(
    () => sortDatasets(displayedResults, sort),
    [displayedResults, sort],
  );
  const paginated = useMemo(
    () => paginate(orderedResults, requestedPage),
    [orderedResults, requestedPage],
  );

  const updateState = useCallback(
    (nextFilters: Filters, nextSort: CatalogSort, nextPage = 1, push = false) => {
      filtersRef.current = nextFilters;
      sortRef.current = nextSort;
      const query = filtersToParams(nextFilters, nextSort, nextPage).toString();
      router[push ? "push" : "replace"](query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  useEffect(() => {
    filtersRef.current = filters;
    sortRef.current = sort;
  }, [filters, sort]);

  useEffect(() => {
    const pageValues = params.getAll("page");
    const canonical = paginated.page === 1
      ? pageValues.length === 0
      : pageValues.length === 1 && pageValues[0] === String(paginated.page);
    if (!canonical) updateState(filters, sort, paginated.page);
  }, [filters, paginated.page, params, sort, updateState]);

  useEffect(() => () => {
    if (searchUpdateRef.current) clearTimeout(searchUpdateRef.current);
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeAtDesktop = () => {
      if (desktop.matches) filterDialogRef.current?.close();
    };
    desktop.addEventListener("change", closeAtDesktop);
    return () => desktop.removeEventListener("change", closeAtDesktop);
  }, []);

  useEffect(() => {
    const syncQuery = () => {
      if (searchUpdateRef.current) clearTimeout(searchUpdateRef.current);
      searchUpdateRef.current = null;
      if (searchRef.current) {
        searchRef.current.value = new URLSearchParams(window.location.search).get("q") ?? "";
      }
    };
    window.addEventListener("popstate", syncQuery);
    return () => window.removeEventListener("popstate", syncQuery);
  }, []);

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
      resultsTitleRef.current?.scrollIntoView({ block: "start" });
      resultsTitleRef.current?.focus({ preventScroll: true });
    },
    [updateState],
  );

  const browseCatalog = useCallback(() => {
    resultsTitleRef.current?.scrollIntoView({ block: "start" });
    resultsTitleRef.current?.focus({ preventScroll: true });
  }, []);

  const openFilters = useCallback((trigger: HTMLButtonElement) => {
    activeFilterTriggerRef.current = trigger;
    filterDialogRef.current?.showModal();
  }, []);

  const restoreFilterTriggerFocus = useCallback(() => {
    const activeTrigger = activeFilterTriggerRef.current;
    const visibleTrigger = activeTrigger?.offsetParent
      ? activeTrigger
      : desktopFilterTriggerRef.current;
    visibleTrigger?.focus();
  }, []);

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-5">
        <section
          aria-labelledby="catalog-hero-title"
          className="px-1 py-4 text-center sm:px-8 sm:py-5 lg:py-6"
        >
          <div className="mx-auto max-w-6xl">
            <p className="eyebrow">{catalogCopy.heroEyebrow}</p>
            <h1
              id="catalog-hero-title"
              className="mt-3 font-heading text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:whitespace-nowrap"
            >
              {catalogCopy.heroTitle}
            </h1>
            <Button size="lg" className="mt-5" onClick={browseCatalog}>
              {catalogCopy.browseDatasets(datasets.length)}
              <ArrowDown aria-hidden="true" />
            </Button>
            <ul className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium text-white/80">
              {catalogCopy.heroProofLabels.map((label) => (
                <li key={label} className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="dataset-catalog"
          aria-labelledby="results-title"
          className="scroll-mt-24 border-t border-white/20 pt-5 sm:pt-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">{catalogCopy.catalogEyebrow}</p>
              <h2
                id="results-title"
                ref={resultsTitleRef}
                tabIndex={-1}
                className="mt-1 rounded-sm text-2xl font-bold text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              >
                {catalogCopy.resultCount(results.length)}
              </h2>
              <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                {catalogCopy.resultStatus(results.length)}
              </p>
              {paginated.totalPages > 1 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {catalogCopy.pageSummary(
                    paginated.page,
                    paginated.totalPages,
                    paginated.start,
                    paginated.end,
                  )}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {chips.length > 0 && (
                <Button variant="ghost" onClick={() => handleChange(EMPTY_FILTERS)}>
                  {filterCopy.clearAllLabel}
                </Button>
              )}
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline" }), "lg:hidden")}
                onClick={(event) => openFilters(event.currentTarget)}
              >
                <Filter aria-hidden="true" /> {filterCopy.moreFiltersLabel}
                {chips.length > 0 && (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
                    {chips.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-end gap-3">
            <div className="min-w-0 flex-1">
              <label htmlFor="dataset-search" className="block text-sm font-semibold text-white">
                {catalogCopy.searchLabel}
              </label>
              <div className="relative mt-2">
                <Search
                  className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="dataset-search"
                  ref={searchRef}
                  type="search"
                  defaultValue={filters.query}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder={catalogCopy.searchPlaceholder}
                  className="h-12 border-white/15 pr-4 pl-12 text-base shadow-[0_4px_4px_rgba(10,10,20,0.45)] placeholder:text-white/40"
                />
              </div>
            </div>
            <button
              ref={desktopFilterTriggerRef}
              type="button"
              className={cn(buttonVariants({ variant: "outline" }), "hidden h-12 lg:inline-flex")}
              onClick={(event) => openFilters(event.currentTarget)}
            >
              <Filter aria-hidden="true" /> {filterCopy.moreFiltersLabel}
              {chips.length > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
                  {chips.length}
                </span>
              )}
            </button>
          </div>

          <DatasetQuickFilters
            idPrefix="desktop"
            options={filterOptions}
            filters={filters}
            onChange={handleChange}
            className="mt-4 hidden lg:grid"
          />

          {chips.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2" aria-label={catalogCopy.activeFiltersAriaLabel}>
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => handleChange(chip.next)}
                  className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-card/80 px-3 text-left text-xs font-medium break-all whitespace-normal text-white/80 transition-colors hover:border-primary/60 hover:text-white"
                  aria-label={catalogCopy.removeFilter(chip.label)}
                >
                  {chip.label} <X className="size-3.5 shrink-0" aria-hidden="true" />
                </button>
              ))}
            </div>
          )}

          {results.length === 0 ? (
            <div className="surface mt-6 px-6 py-14 text-center">
              <h3 className="text-xl font-semibold text-white">{catalogCopy.emptyTitle}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{catalogCopy.emptyDescription}</p>
              <Button className="mt-5" onClick={() => handleChange(EMPTY_FILTERS)}>
                {catalogCopy.clearFiltersLabel}
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:hidden">
                {paginated.items.map((dataset) => (
                  <DatasetCard
                    key={dataset.id}
                    dataset={dataset}
                    featured={isUnfiltered && dataset.id === catalogCopy.recommendedDatasetId}
                  />
                ))}
              </div>
              <div className="mt-5 hidden lg:block">
                <DatasetTable
                  datasets={paginated.items}
                  sort={sort}
                  onSortChange={handleSortChange}
                  featuredId={isUnfiltered ? catalogCopy.recommendedDatasetId : undefined}
                />
              </div>
              <CatalogPagination
                page={paginated.page}
                totalPages={paginated.totalPages}
                start={paginated.start}
                end={paginated.end}
                total={results.length}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </section>
      </div>

      <dialog
        ref={filterDialogRef}
        aria-labelledby="filter-dialog-title"
        aria-describedby="filter-dialog-description"
        className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[min(92vw,28rem)] max-w-none border-0 border-l border-white/10 bg-brand-black p-0 text-white shadow-[0_4px_4px_rgba(10,10,20,0.65)] backdrop:bg-brand-black/80 backdrop:backdrop-blur-sm"
        onClose={restoreFilterTriggerFocus}
      >
        <div className="flex h-full flex-col">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-brand-black/95 px-5 py-4 backdrop-blur">
            <div>
              <h2 id="filter-dialog-title" className="text-lg font-semibold">{catalogCopy.drawerTitle}</h2>
              <p id="filter-dialog-description" className="sr-only">{catalogCopy.drawerDescription}</p>
            </div>
            <button
              type="button"
              className="grid size-11 place-items-center rounded-[10px] text-white/80 hover:bg-white/10 hover:text-white"
              aria-label={catalogCopy.closeFiltersLabel}
              onClick={() => filterDialogRef.current?.close()}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 space-y-7 overflow-y-auto p-5">
            <DatasetQuickFilters
              idPrefix="drawer"
              options={filterOptions}
              filters={filters}
              onChange={handleChange}
              className="lg:hidden"
            />
            <DatasetFilters options={filterOptions} filters={filters} onChange={handleChange} />
          </div>
          <div className="sticky bottom-0 border-t border-white/10 bg-brand-black/95 p-4 backdrop-blur">
            <button
              type="button"
              className={cn(buttonVariants({ size: "lg" }), "w-full")}
              onClick={() => filterDialogRef.current?.close()}
            >
              {catalogCopy.showResults(results.length)}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
