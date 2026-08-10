"use client";

import { useCallback, useMemo } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Filter, Search, Sparkles, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Dataset } from "@/lib/schema";
import {
  EMPTY_FILTERS,
  filterDatasets,
  getFilterOptions,
  type DatasetFilters as Filters,
} from "@/lib/search";
import {
  applyQuickPreset,
  filtersToParams,
  parseFilters,
} from "@/lib/filter-params";
import { DatasetCard } from "@/components/DatasetCard";
import { DatasetFilters } from "@/components/DatasetFilters";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ActiveChip = {
  key: string;
  label: string;
  next: Filters;
};

function activeChips(filters: Filters): ActiveChip[] {
  const chips: ActiveChip[] = [];
  if (filters.query) {
    chips.push({ key: "query", label: `Search: ${filters.query}`, next: { ...filters, query: "" } });
  }
  const groups: Array<[keyof Filters, string[], string]> = [
    ["domains", filters.domains, "Domain"],
    ["dataTypes", filters.dataTypes, "Type"],
    ["tasks", filters.tasks, "Task"],
    ["difficulties", filters.difficulties, "Level"],
    ["sizes", filters.sizes, "Size"],
    ["formats", filters.formats, "Format"],
    ["geographies", filters.geographies, "Place"],
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
      label: filters.apiKeyRequired ? "API key required" : "No API key",
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

  const handleChange = useCallback(
    (next: Filters) => updateFilters(next),
    [updateFilters],
  );

  const beginnerActive =
    filters.difficulties.length === 1 && filters.difficulties[0] === "beginner";
  const smallCsvActive =
    filters.sizes.includes("Tiny") &&
    filters.sizes.includes("Small") &&
    filters.formats.includes("CSV") &&
    filters.apiKeyRequired === false;

  return (
    <Dialog.Root>
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#1e1e44] px-5 py-9 shadow-[0_28px_90px_rgba(0,0,0,0.3)] sm:px-8 sm:py-12 lg:px-12">
        <div className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-primary/15 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="eyebrow">Open data, practical starts</p>
          <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Find your first dataset
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
            Choose a free dataset, understand what it needs, and follow a guided Python project from first download to first insight.
          </p>

          <label htmlFor="dataset-search" className="mt-8 block text-sm font-semibold text-white">
            Search by topic, task, format, or provider
          </label>
          <div className="relative mt-2 max-w-2xl">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="dataset-search"
              type="search"
              value={filters.query}
              onChange={(event) => handleChange({ ...filters, query: event.target.value })}
              placeholder="Try classification, maps, economics…"
              className="h-13 rounded-xl border-white/15 bg-[#0a0a14]/70 pr-4 pl-12 text-base shadow-lg placeholder:text-white/40"
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium text-white/55">Quick starts</span>
            <Button
              variant="outline"
              size="sm"
              aria-pressed={beginnerActive}
              className={beginnerActive ? "border-primary bg-primary/15 text-primary" : undefined}
              onClick={() => updateFilters(applyQuickPreset(filters, "beginner"), "push")}
            >
              <Sparkles aria-hidden="true" /> Beginner-friendly
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-pressed={smallCsvActive}
              className={smallCsvActive ? "border-primary bg-primary/15 text-primary" : undefined}
              onClick={() => updateFilters(applyQuickPreset(filters, "small-csv"), "push")}
            >
              Small CSVs
            </Button>
          </div>
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="surface sticky top-24 hidden h-fit p-5 lg:block">
          <DatasetFilters datasets={datasets} filters={filters} onChange={handleChange} />
        </aside>

        <section aria-labelledby="results-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Catalog</p>
              <h2 id="results-title" className="mt-1 text-2xl font-bold text-white">
                {results.length} dataset{results.length === 1 ? "" : "s"}
              </h2>
            </div>
            <Dialog.Trigger
              className={cn(buttonVariants({ variant: "outline" }), "lg:hidden")}
            >
              <Filter aria-hidden="true" /> Filters
              {chips.length > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
                  {chips.length}
                </span>
              )}
            </Dialog.Trigger>
          </div>

          {chips.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2" aria-label="Active filters">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => handleChange(chip.next)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/80 transition-colors hover:border-primary/60 hover:text-white"
                  aria-label={`Remove ${chip.label} filter`}
                >
                  {chip.label} <X className="size-3.5" aria-hidden="true" />
                </button>
              ))}
            </div>
          )}

          {results.length === 0 ? (
            <div className="surface mt-6 px-6 py-14 text-center">
              <h3 className="text-xl font-semibold text-white">No matching datasets</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Try a broader search or remove one of the active filters.
              </p>
              <Button className="mt-5" onClick={() => handleChange(EMPTY_FILTERS)}>
                Clear filters
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

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-[#0a0a14]/80 backdrop-blur-sm transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-[70] flex justify-end">
          <Dialog.Popup className="flex h-dvh w-[min(92vw,26rem)] flex-col border-l border-white/10 bg-[#0a0a14] text-white shadow-2xl transition-transform duration-200 data-ending-style:translate-x-full data-starting-style:translate-x-full">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0a0a14]/95 px-5 py-4 backdrop-blur">
              <div>
                <Dialog.Title className="text-lg font-semibold">Filter datasets</Dialog.Title>
                <Dialog.Description className="sr-only">
                  Refine the catalog by difficulty, topic, format, access, and size.
                </Dialog.Description>
              </div>
              <Dialog.Close
                className="grid size-11 place-items-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
                aria-label="Close filters"
              >
                <X aria-hidden="true" />
              </Dialog.Close>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <DatasetFilters datasets={datasets} filters={filters} onChange={handleChange} />
            </div>
            <div className="sticky bottom-0 border-t border-white/10 bg-[#0a0a14]/95 p-4 backdrop-blur">
              <Dialog.Close className={cn(buttonVariants({ size: "lg" }), "w-full")}>
                Show {results.length} dataset{results.length === 1 ? "" : "s"}
              </Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
