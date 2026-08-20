"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Filter, Search, X } from "lucide-react";
import type { CatalogDataset } from "@/lib/schema";
import { activeChips } from "@/lib/catalog-chips";
import {
  EMPTY_FILTERS,
  paginate,
  type CatalogSort,
  type DatasetFilters as Filters,
  type FilterOptions,
} from "@/lib/search";
import { BuildPathCards, type CollectionCardModel } from "@/components/BuildPathCards";
import { CatalogPagination } from "@/components/CatalogPagination";
import { DatasetCard } from "@/components/DatasetCard";
import { DatasetFilters, DatasetQuickFilters } from "@/components/DatasetFilters";
import { DatasetTable } from "@/components/DatasetTable";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { catalogCopy, filterCopy } from "@/content/site-copy";

export function CatalogView({
  collections,
  starterIds,
  trustSummary,
  filterOptions,
  filters,
  results,
  paginated,
  sort,
  searchInputRef,
  resultsTitleRef,
  onFiltersChange,
  onSearchChange,
  onSortChange,
  onPageChange,
}: {
  collections: CollectionCardModel[];
  starterIds: string[];
  trustSummary: string;
  filterOptions: FilterOptions;
  filters: Filters;
  results: CatalogDataset[];
  paginated: ReturnType<typeof paginate<CatalogDataset>>;
  sort: CatalogSort;
  searchInputRef: RefObject<HTMLInputElement | null>;
  resultsTitleRef: RefObject<HTMLHeadingElement | null>;
  onFiltersChange: (filters: Filters) => void;
  onSearchChange: (query: string) => void;
  onSortChange: (sort: CatalogSort) => void;
  onPageChange: (page: number) => void;
}) {
  const chips = activeChips(filters);
  const facetCount = chips.filter((chip) => chip.key !== "query").length;
  const isUnfiltered = chips.length === 0;
  const starterSet = new Set(starterIds);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterDialogRef = useRef<HTMLDialogElement>(null);
  const activeFilterTriggerRef = useRef<HTMLButtonElement | null>(null);
  const desktopFilterTriggerRef = useRef<HTMLButtonElement>(null);

  const restoreFilterTriggerFocus = useCallback(() => {
    const activeTrigger = activeFilterTriggerRef.current;
    const visibleTrigger = activeTrigger?.offsetParent
      ? activeTrigger
      : desktopFilterTriggerRef.current;
    visibleTrigger?.focus();
  }, []);

  const openFilters = useCallback((trigger: HTMLButtonElement) => {
    activeFilterTriggerRef.current = trigger;
    filterDialogRef.current?.showModal();
    setFiltersOpen(true);
  }, [setFiltersOpen]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeAtDesktop = () => {
      if (desktop.matches) filterDialogRef.current?.close();
    };
    desktop.addEventListener("change", closeAtDesktop);
    return () => desktop.removeEventListener("change", closeAtDesktop);
  }, []);

  const pagination = (
    <CatalogPagination
      page={paginated.page}
      totalPages={paginated.totalPages}
      start={paginated.start}
      end={paginated.end}
      total={results.length}
      onPageChange={onPageChange}
    />
  );

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-2 sm:px-6 sm:pt-8">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <section aria-labelledby="catalog-hero-title" className="min-w-0">
            <h1
              id="catalog-hero-title"
              className="font-heading text-3xl font-bold leading-tight tracking-tight text-balance text-white sm:text-4xl lg:whitespace-nowrap"
            >
              {catalogCopy.heroTitle}
            </h1>
          </section>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="sr-only">{catalogCopy.catalogEyebrow}</p>
            <h2
              id="results-title"
              ref={resultsTitleRef}
              tabIndex={-1}
              className="rounded-sm text-sm font-semibold whitespace-nowrap text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              {catalogCopy.resultCount(results.length)}
            </h2>
            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              {catalogCopy.resultStatus(results.length)}
            </p>
            {paginated.totalPages > 1 && (
              <>
                <span className="hidden text-white/30 lg:inline" aria-hidden="true">·</span>
                <span className="hidden text-xs whitespace-nowrap text-muted-foreground lg:inline">
                  {catalogCopy.pageSummary(
                    paginated.page,
                    paginated.totalPages,
                    paginated.start,
                    paginated.end,
                  )}
                </span>
              </>
            )}
            {chips.length > 0 && (
              <Button variant="ghost" onClick={() => onFiltersChange(EMPTY_FILTERS)}>
                {filterCopy.clearAllLabel}
              </Button>
            )}
          </div>
        </div>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{trustSummary}</p>

        {isUnfiltered && paginated.page === 1 && (
          <BuildPathCards collections={collections} />
        )}

        <section
          id="dataset-catalog"
          aria-labelledby="results-title"
          className="scroll-mt-24 pt-8"
        >
          <h2 className="text-xl font-semibold text-white">{catalogCopy.catalogSectionTitle}</h2>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1 sm:min-w-48 lg:max-w-xs xl:max-w-sm">
              <label htmlFor="dataset-search" className="sr-only">
                {catalogCopy.searchLabel}
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="dataset-search"
                  ref={searchInputRef}
                  type="search"
                  defaultValue={filters.query}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder={catalogCopy.searchPlaceholder}
                  className="border-white/15 pr-4 pl-12 placeholder:text-white/40 [&::-webkit-search-cancel-button]:appearance-none"
                />
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-2 max-sm:w-full lg:flex-1">
              <DatasetQuickFilters
                idPrefix="desktop"
                options={filterOptions}
                filters={filters}
                onChange={onFiltersChange}
                compact
                className="hidden min-w-0 flex-1 lg:flex"
              />
              <button
                ref={desktopFilterTriggerRef}
                type="button"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-11 w-full shrink-0 sm:w-auto",
                )}
                aria-haspopup="dialog"
                aria-expanded={filtersOpen}
                aria-controls="catalog-filter-dialog"
                onClick={(event) => openFilters(event.currentTarget)}
              >
                <Filter aria-hidden="true" /> {filterCopy.moreFiltersLabel}
                {facetCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground"
                  >
                    {facetCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {chips.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2" aria-label={catalogCopy.activeFiltersAriaLabel}>
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => onFiltersChange(chip.next)}
                  className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-card/80 px-3 text-left text-xs font-medium break-all whitespace-normal text-white/80 transition-colors hover:border-primary/60 hover:text-white"
                  aria-label={catalogCopy.removeFilter(chip.label)}
                >
                  {chip.label} <X className="size-3.5 shrink-0" aria-hidden="true" />
                </button>
              ))}
            </div>
          )}

          {results.length === 0 ? (
            <div className="surface mt-4 px-6 py-8 text-center">
              <h3 className="text-lg font-semibold text-white">{catalogCopy.emptyTitle}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{catalogCopy.emptyDescription}</p>
              <Button className="mt-4" onClick={() => onFiltersChange(EMPTY_FILTERS)}>
                {catalogCopy.clearFiltersLabel}
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-1.5 grid gap-4 sm:grid-cols-2 lg:hidden">
                {paginated.items.map((dataset) => (
                  <DatasetCard
                    key={dataset.id}
                    dataset={dataset}
                    featured={isUnfiltered && starterSet.has(dataset.id)}
                  />
                ))}
              </div>
              <div className="surface mt-1.5 hidden lg:block">
                <DatasetTable
                  datasets={paginated.items}
                  sort={sort}
                  onSortChange={onSortChange}
                  featuredId={undefined}
                  featuredIds={isUnfiltered ? starterIds : []}
                />
                <div className="px-3 pb-2">{pagination}</div>
              </div>
              <div className="lg:hidden">{pagination}</div>
            </>
          )}
        </section>
      </div>

      <dialog
        ref={filterDialogRef}
        id="catalog-filter-dialog"
        aria-labelledby="filter-dialog-title"
        aria-describedby="filter-dialog-description"
        className="fixed inset-y-0 right-0 left-auto z-[60] m-0 h-dvh max-h-none w-[min(92vw,28rem)] max-w-none border-0 border-l border-white/10 bg-brand-black p-0 text-white shadow-[0_4px_4px_rgba(10,10,20,0.65)] backdrop:bg-brand-black/80 backdrop:backdrop-blur-sm"
        onClose={() => {
          setFiltersOpen(false);
          restoreFilterTriggerFocus();
        }}
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
          <div className="min-h-0 flex-1 space-y-7 overflow-y-auto p-5 pb-6">
            <DatasetQuickFilters
              idPrefix="drawer"
              options={filterOptions}
              filters={filters}
              onChange={onFiltersChange}
              className="xl:hidden"
            />
            <DatasetFilters options={filterOptions} filters={filters} onChange={onFiltersChange} />
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
