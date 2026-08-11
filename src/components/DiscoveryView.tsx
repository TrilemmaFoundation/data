"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { ArrowDown, Filter, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CatalogDataset } from "@/lib/schema";
import {
  EMPTY_FILTERS,
  filterDatasets,
  getFilterOptions,
  type DatasetFilters as Filters,
} from "@/lib/search";
import { filtersToParams, parseFilters } from "@/lib/filter-params";
import { DatasetCard } from "@/components/DatasetCard";
import { DatasetFilters } from "@/components/DatasetFilters";
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
  const groups: Array<[keyof Filters, string[], string]> = [
    ["domains", filters.domains, filterChipPrefixes.domains],
    ["dataTypes", filters.dataTypes, filterChipPrefixes.dataTypes],
    ["tasks", filters.tasks, filterChipPrefixes.tasks],
    ["difficulties", filters.difficulties, filterChipPrefixes.difficulties],
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

export function DiscoveryView({ datasets }: { datasets: CatalogDataset[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filterOptions = useMemo(() => getFilterOptions(datasets), [datasets]);
  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString()), filterOptions),
    [filterOptions, searchParams],
  );
  const filtersRef = useRef(filters);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsTitleRef = useRef<HTMLHeadingElement>(null);
  const filterDialogRef = useRef<HTMLDialogElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
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

  const updateFilters = useCallback(
    (next: Filters) => {
      filtersRef.current = next;
      const query = filtersToParams(next).toString();
      const href = query ? `${pathname}?${query}` : pathname;
      router.replace(href, { scroll: false });
    },
    [pathname, router],
  );

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

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
      if (searchRef.current) {
        searchRef.current.value =
          new URLSearchParams(window.location.search).get("q") ?? "";
      }
    };
    window.addEventListener("popstate", syncQuery);
    return () => window.removeEventListener("popstate", syncQuery);
  }, []);

  const handleChange = useCallback(
    (next: Filters) => {
      if (searchRef.current) searchRef.current.value = next.query;
      updateFilters(next);
    },
    [updateFilters],
  );

  const browseCatalog = useCallback(() => {
    resultsTitleRef.current?.scrollIntoView({ block: "start" });
    resultsTitleRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <section
          aria-labelledby="catalog-hero-title"
          className="px-1 py-8 text-center sm:px-8 sm:py-12 lg:py-14"
        >
          <div className="mx-auto max-w-6xl">
            <p className="eyebrow">{catalogCopy.heroEyebrow}</p>
            <h1
              id="catalog-hero-title"
              className="mt-3 font-heading text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl lg:whitespace-nowrap"
            >
              {catalogCopy.heroTitle}
            </h1>

            <Button size="lg" className="mt-7" onClick={browseCatalog}>
              {catalogCopy.browseDatasets(datasets.length)}
              <ArrowDown aria-hidden="true" />
            </Button>

            <ul className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium text-white/80">
              {catalogCopy.heroProofLabels.map((label) => (
                <li key={label} className="flex items-center gap-2">
                  <span
                    className="size-1.5 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="mt-4 grid gap-8 border-t border-white/20 pt-8 sm:mt-6 sm:pt-10 lg:grid-cols-[260px_1fr]">
          <aside
            aria-label={filterCopy.title}
            className="surface sticky top-24 hidden h-fit max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain p-5 [scrollbar-gutter:stable] lg:block"
          >
            <DatasetFilters
              options={filterOptions}
              filters={filters}
              onChange={handleChange}
            />
          </aside>

        <section
          id="dataset-catalog"
          aria-labelledby="results-title"
          className="scroll-mt-24"
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
            </div>
            <button
              ref={filterTriggerRef}
              type="button"
              className={cn(buttonVariants({ variant: "outline" }), "lg:hidden")}
              onClick={() => filterDialogRef.current?.showModal()}
            >
              <Filter aria-hidden="true" /> {filterCopy.title}
              {chips.length > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
                  {chips.length}
                </span>
              )}
            </button>
          </div>

          <label htmlFor="dataset-search" className="mt-5 block text-sm font-semibold text-white">
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
              onChange={(event) => {
                updateFilters({ ...filtersRef.current, query: event.target.value });
              }}
              placeholder={catalogCopy.searchPlaceholder}
              className="h-13 border-white/15 pr-4 pl-12 text-base shadow-[0_4px_4px_rgba(10,10,20,0.45)] placeholder:text-white/40"
            />
          </div>

          {chips.length > 0 && (
            <div
              className="mt-5 flex flex-wrap gap-2"
              aria-label={catalogCopy.activeFiltersAriaLabel}
            >
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
              <h3 className="text-xl font-semibold text-white">
                {catalogCopy.emptyTitle}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {catalogCopy.emptyDescription}
              </p>
              <Button className="mt-5" onClick={() => handleChange(EMPTY_FILTERS)}>
                {catalogCopy.clearFiltersLabel}
              </Button>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {displayedResults.map((dataset) => (
                <DatasetCard
                  key={dataset.id}
                  dataset={dataset}
                  featured={
                    isUnfiltered && dataset.id === catalogCopy.recommendedDatasetId
                  }
                />
              ))}
            </div>
          )}
          </section>
        </div>
      </div>

      <dialog
        ref={filterDialogRef}
        aria-labelledby="filter-dialog-title"
        aria-describedby="filter-dialog-description"
        className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[min(92vw,26rem)] max-w-none border-0 border-l border-white/10 bg-brand-black p-0 text-white shadow-[0_4px_4px_rgba(10,10,20,0.65)] backdrop:bg-brand-black/80 backdrop:backdrop-blur-sm"
        onClose={() => {
          if (!window.matchMedia("(min-width: 1024px)").matches) {
            filterTriggerRef.current?.focus();
          }
        }}
      >
        <div className="flex h-full flex-col">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-brand-black/95 px-5 py-4 backdrop-blur">
            <div>
              <h2 id="filter-dialog-title" className="text-lg font-semibold">
                {catalogCopy.drawerTitle}
              </h2>
              <p id="filter-dialog-description" className="sr-only">
                {catalogCopy.drawerDescription}
              </p>
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
          <div className="flex-1 overflow-y-auto p-5">
            <DatasetFilters
              options={filterOptions}
              filters={filters}
              onChange={handleChange}
            />
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
