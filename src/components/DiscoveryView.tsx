"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Dataset } from "@/lib/schema";
import { filterDatasets, type DatasetFilters } from "@/lib/search";
import { SIZE_CATEGORIES, type SizeCategory } from "@/lib/size";
import { DatasetCard } from "@/components/DatasetCard";
import { DatasetFilters as DatasetFiltersPanel } from "@/components/DatasetFilters";

function parseList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseFilters(params: URLSearchParams): DatasetFilters {
  const apiKey = params.get("apiKey");
  const sizes = parseList(params.get("size")).filter(
    (item): item is SizeCategory =>
      (SIZE_CATEGORIES as readonly string[]).includes(item),
  );

  return {
    query: params.get("q") ?? "",
    domains: parseList(params.get("domain")),
    dataTypes: parseList(params.get("dataType")),
    tasks: parseList(params.get("task")),
    difficulties: parseList(params.get("difficulty")),
    sizes,
    formats: parseList(params.get("format")),
    apiKeyRequired:
      apiKey === "true" ? true : apiKey === "false" ? false : null,
    geographies: parseList(params.get("geography")),
  };
}

function filtersToParams(filters: DatasetFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.domains.length) params.set("domain", filters.domains.join(","));
  if (filters.dataTypes.length)
    params.set("dataType", filters.dataTypes.join(","));
  if (filters.tasks.length) params.set("task", filters.tasks.join(","));
  if (filters.difficulties.length)
    params.set("difficulty", filters.difficulties.join(","));
  if (filters.sizes.length) params.set("size", filters.sizes.join(","));
  if (filters.formats.length) params.set("format", filters.formats.join(","));
  if (filters.apiKeyRequired !== null)
    params.set("apiKey", String(filters.apiKeyRequired));
  if (filters.geographies.length)
    params.set("geography", filters.geographies.join(","));
  return params;
}

function hasActiveFilters(filters: DatasetFilters): boolean {
  return Boolean(
    filters.query ||
      filters.domains.length ||
      filters.dataTypes.length ||
      filters.tasks.length ||
      filters.difficulties.length ||
      filters.sizes.length ||
      filters.formats.length ||
      filters.geographies.length ||
      filters.apiKeyRequired !== null,
  );
}

type DiscoveryViewProps = {
  datasets: Dataset[];
};

export function DiscoveryView({ datasets }: DiscoveryViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Derive from the URL so back/forward and shared links stay in sync.
  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const results = useMemo(
    () => filterDatasets(datasets, filters),
    [datasets, filters],
  );

  const handleChange = useCallback(
    (next: DatasetFilters) => {
      const params = filtersToParams(next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router],
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 max-w-3xl space-y-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Discover open datasets
        </h1>
        <p className="text-muted-foreground">
          Find free, openly licensed datasets by what they contain and what you
          can build with them. The catalog is curated for beginners and
          contribution-friendly — one YAML file per dataset.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <DatasetFiltersPanel
          datasets={datasets}
          filters={filters}
          onChange={handleChange}
        />

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {results.length} dataset{results.length === 1 ? "" : "s"}
              {hasActiveFilters(filters) ? " match your filters" : ""}
            </p>
          </div>

          {results.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
              No datasets match these filters. Try clearing a few.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((dataset) => (
                <DatasetCard key={dataset.id} dataset={dataset} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
