"use client";

import {
  EMPTY_FILTERS,
  type DatasetFilters as Filters,
  type FilterOptions,
} from "@/lib/search";
import type { SizeCategory } from "@/lib/size";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { filterCopy } from "@/content/site-copy";

type DatasetFiltersProps = {
  options: FilterOptions;
  filters: Filters;
  onChange: (filters: Filters) => void;
};

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold text-white">{title}</legend>
      <div className="space-y-1">{children}</div>
    </fieldset>
  );
}

function FilterCheckbox({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white">
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
      <span>{label}</span>
    </label>
  );
}

export function DatasetFilters({ options, filters, onChange }: DatasetFiltersProps) {
  const hasActiveFilters =
    filters.query !== "" ||
    filters.apiKeyRequired !== null ||
    [
      filters.domains,
      filters.dataTypes,
      filters.tasks,
      filters.difficulties,
      filters.sizes,
      filters.formats,
      filters.geographies,
    ].some((values) => values.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">{filterCopy.eyebrow}</p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            {filterCopy.title}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasActiveFilters}
          onClick={() => onChange(EMPTY_FILTERS)}
        >
          {filterCopy.clearAllLabel}
        </Button>
      </div>

      <FilterGroup title={filterCopy.difficultyLabel}>
        {options.difficulties.map((difficulty) => (
          <FilterCheckbox
            key={difficulty}
            label={difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            checked={filters.difficulties.includes(difficulty)}
            onCheckedChange={() =>
              onChange({
                ...filters,
                difficulties: toggleValue(filters.difficulties, difficulty),
              })
            }
          />
        ))}
      </FilterGroup>

      <FilterGroup title={filterCopy.domainLabel}>
        {options.domains.map((domain) => (
          <FilterCheckbox
            key={domain}
            label={domain}
            checked={filters.domains.includes(domain)}
            onCheckedChange={() =>
              onChange({ ...filters, domains: toggleValue(filters.domains, domain) })
            }
          />
        ))}
      </FilterGroup>

      <FilterGroup title={filterCopy.dataTypeLabel}>
        {options.dataTypes.map((dataType) => (
          <FilterCheckbox
            key={dataType}
            label={dataType}
            checked={filters.dataTypes.includes(dataType)}
            onCheckedChange={() =>
              onChange({ ...filters, dataTypes: toggleValue(filters.dataTypes, dataType) })
            }
          />
        ))}
      </FilterGroup>

      <details className="group rounded-xl border border-white/10 bg-white/[0.025] p-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-sm text-sm font-semibold text-white marker:content-none">
          {filterCopy.moreFiltersLabel}
          <span aria-hidden="true" className="text-lg text-primary transition-transform group-open:rotate-45">+</span>
        </summary>
        <div className="mt-5 space-y-6 border-t border-white/10 pt-5">
          <FilterGroup title={filterCopy.taskLabel}>
            {options.tasks.map((task) => (
              <FilterCheckbox
                key={task}
                label={task}
                checked={filters.tasks.includes(task)}
                onCheckedChange={() =>
                  onChange({ ...filters, tasks: toggleValue(filters.tasks, task) })
                }
              />
            ))}
          </FilterGroup>

          <FilterGroup title={filterCopy.sizeLabel}>
            {options.sizes.map((size) => (
              <FilterCheckbox
                key={size}
                label={size}
                checked={filters.sizes.includes(size)}
                onCheckedChange={() =>
                  onChange({
                    ...filters,
                    sizes: toggleValue(filters.sizes, size) as SizeCategory[],
                  })
                }
              />
            ))}
          </FilterGroup>

          <FilterGroup title={filterCopy.formatLabel}>
            {options.formats.map((format) => (
              <FilterCheckbox
                key={format}
                label={format}
                checked={filters.formats.includes(format)}
                onCheckedChange={() =>
                  onChange({ ...filters, formats: toggleValue(filters.formats, format) })
                }
              />
            ))}
          </FilterGroup>

          <FilterGroup title={filterCopy.apiKeyLabel}>
            <FilterCheckbox
              label={filterCopy.yesLabel}
              checked={filters.apiKeyRequired === true}
              onCheckedChange={(checked) =>
                onChange({ ...filters, apiKeyRequired: checked ? true : null })
              }
            />
            <FilterCheckbox
              label={filterCopy.noLabel}
              checked={filters.apiKeyRequired === false}
              onCheckedChange={(checked) =>
                onChange({ ...filters, apiKeyRequired: checked ? false : null })
              }
            />
          </FilterGroup>

          <FilterGroup title={filterCopy.geographyLabel}>
            {options.geographies.map((geography) => (
              <FilterCheckbox
                key={geography}
                label={geography}
                checked={filters.geographies.includes(geography)}
                onCheckedChange={() =>
                  onChange({
                    ...filters,
                    geographies: toggleValue(filters.geographies, geography),
                  })
                }
              />
            ))}
          </FilterGroup>
        </div>
      </details>
    </div>
  );
}
