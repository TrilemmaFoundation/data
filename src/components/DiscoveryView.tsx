"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { ArrowDown, ArrowRight, CloudRain, Filter, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Dataset } from "@/lib/schema";
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
import { datasetPath } from "@/lib/seo";
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

export function DiscoveryView({ datasets }: { datasets: Dataset[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filterOptions = useMemo(() => getFilterOptions(datasets), [datasets]);
  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString()), filterOptions),
    [filterOptions, searchParams],
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const filterDialogRef = useRef<HTMLDialogElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const results = useMemo(() => filterDatasets(datasets, filters), [datasets, filters]);
  const chips = useMemo(() => activeChips(filters), [filters]);

  const updateFilters = useCallback(
    (next: Filters, history: "push" | "replace" = "replace") => {
      const query = filtersToParams(next).toString();
      const href = query ? `${pathname}?${query}` : pathname;
      if (history === "push") router.push(href, { scroll: false });
      else router.replace(href, { scroll: false });
    },
    [pathname, router],
  );

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

  const selectIdea = useCallback(
    (query: string) => {
      if (searchRef.current) searchRef.current.value = query;
      updateFilters({ ...EMPTY_FILTERS, query }, "push");
    },
    [updateFilters],
  );

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#1e1e44] px-5 py-8 shadow-[0_28px_90px_rgba(0,0,0,0.3)] sm:px-8 sm:py-9 lg:px-10">
        <div className="pointer-events-none absolute -top-36 -right-24 size-80 rounded-full bg-primary/12 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-44 left-1/3 size-80 rounded-full bg-secondary/10 blur-3xl" aria-hidden="true" />

        <div className="relative grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)] lg:items-stretch xl:gap-10">
          <div className="min-w-0">
            <p className="eyebrow">{catalogCopy.heroEyebrow}</p>
            <h1 className="mt-3 max-w-3xl font-heading text-4xl font-bold leading-[1.04] tracking-tight text-white sm:text-5xl lg:text-[3.5rem]">
              {catalogCopy.heroTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
              {catalogCopy.heroDescription}
            </p>

            <label htmlFor="dataset-search" className="mt-6 block text-sm font-semibold text-white">
              {catalogCopy.searchLabel}
            </label>
            <div className="relative mt-2 max-w-2xl">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="dataset-search"
                ref={searchRef}
                type="search"
                defaultValue={filters.query}
                onChange={(event) => {
                  updateFilters({ ...filters, query: event.target.value });
                }}
                placeholder={catalogCopy.searchPlaceholder}
                className="h-13 rounded-xl border-white/15 bg-[#0a0a14]/70 pr-4 pl-12 text-base shadow-lg placeholder:text-white/40"
              />
            </div>

            <a
              href="#results-title"
              className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-secondary transition-colors hover:text-white"
            >
              <ArrowDown className="size-4" aria-hidden="true" />
              {catalogCopy.resultsLink(results.length)}
            </a>

            <div className="mt-4">
              <p className="text-xs font-semibold tracking-wide text-white/60 uppercase">
                {catalogCopy.productIdeasLabel}
              </p>
              <div
                className="mt-2 flex flex-wrap gap-2"
                role="group"
                aria-label={catalogCopy.productIdeasAriaLabel}
              >
                {catalogCopy.productIdeas.map((idea) => {
                  const active = filters.query === idea.query;
                  return (
                    <Button
                      key={idea.id}
                      variant="outline"
                      size="sm"
                      aria-pressed={active}
                      className={cn(
                        "justify-start whitespace-normal",
                        active && "border-primary bg-primary/15 text-primary",
                      )}
                      onClick={() => selectIdea(idea.query)}
                    >
                      {idea.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          <aside
            aria-labelledby="featured-starter-title"
            className="relative overflow-hidden rounded-2xl border border-primary/30 bg-[linear-gradient(145deg,rgba(255,153,64,0.13),rgba(108,168,228,0.08)_58%,rgba(10,10,20,0.45))] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)] sm:p-6"
          >
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/15 text-primary">
                <CloudRain className="size-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="eyebrow">{catalogCopy.featuredStarter.eyebrow}</p>
                <h2 id="featured-starter-title" className="mt-2 text-2xl font-bold leading-tight text-white">
                  {catalogCopy.featuredStarter.title}
                </h2>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-white/70 sm:text-base">
              {catalogCopy.featuredStarter.description}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {catalogCopy.featuredStarter.badges.map((badge) => (
                <span key={badge} className="rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/75">
                  {badge}
                </span>
              ))}
            </div>

            <ol className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {catalogCopy.featuredStarter.steps.map((step, index) => (
                <li key={step} className="rounded-xl border border-white/10 bg-[#0a0a14]/35 p-3 text-sm font-medium text-white/85">
                  <span className="mb-2 block text-xs font-bold text-primary">0{index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>

            <Link
              href={datasetPath(catalogCopy.featuredStarter.datasetId)}
              className={cn(buttonVariants({ size: "lg" }), "mt-5 w-full sm:w-auto")}
            >
              {catalogCopy.featuredStarter.ctaLabel}
              <ArrowRight aria-hidden="true" />
            </Link>
          </aside>
        </div>

        <ul className="relative mt-7 grid gap-3 border-t border-white/10 pt-5 text-sm font-medium text-white/70 sm:grid-cols-3 sm:gap-5">
          {[
            catalogCopy.trustDatasetCount(datasets.length),
            catalogCopy.trustPythonLabel,
            catalogCopy.trustVerificationLabel,
          ].map((label) => (
            <li key={label} className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside aria-label={filterCopy.title} className="surface sticky top-24 hidden h-fit p-5 lg:block">
          <DatasetFilters datasets={datasets} filters={filters} onChange={handleChange} />
        </aside>

        <section aria-labelledby="results-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">{catalogCopy.catalogEyebrow}</p>
              <h2 id="results-title" className="mt-1 text-2xl font-bold text-white">
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
                  className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-left text-xs font-medium break-all whitespace-normal text-white/80 transition-colors hover:border-primary/60 hover:text-white"
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
              {results.map((dataset) => (
                <DatasetCard key={dataset.id} dataset={dataset} />
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
        className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[min(92vw,26rem)] max-w-none border-0 border-l border-white/10 bg-[#0a0a14] p-0 text-white shadow-2xl backdrop:bg-[#0a0a14]/80 backdrop:backdrop-blur-sm"
        onClose={() => {
          if (!window.matchMedia("(min-width: 1024px)").matches) {
            filterTriggerRef.current?.focus();
          }
        }}
      >
          <div className="flex h-full flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0a0a14]/95 px-5 py-4 backdrop-blur">
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
                className="grid size-11 place-items-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
                aria-label={catalogCopy.closeFiltersLabel}
                onClick={() => filterDialogRef.current?.close()}
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <DatasetFilters datasets={datasets} filters={filters} onChange={handleChange} />
            </div>
            <div className="sticky bottom-0 border-t border-white/10 bg-[#0a0a14]/95 p-4 backdrop-blur">
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
