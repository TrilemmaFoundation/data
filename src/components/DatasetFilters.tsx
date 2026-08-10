"use client";

import { useMemo } from "react";
import { Search, X } from "lucide-react";
import type { Dataset } from "@/lib/schema";
import {
  EMPTY_FILTERS,
  getFilterOptions,
  type DatasetFilters,
} from "@/lib/search";
import type { SizeCategory } from "@/lib/size";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

type DatasetFiltersProps = {
  datasets: Dataset[];
  filters: DatasetFilters;
  onChange: (filters: DatasetFilters) => void;
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
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
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
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <span>{label}</span>
    </label>
  );
}

export function DatasetFilters({
  datasets,
  filters,
  onChange,
}: DatasetFiltersProps) {
  const options = useMemo(() => getFilterOptions(datasets), [datasets]);

  const activeCount =
    (filters.query ? 1 : 0) +
    filters.domains.length +
    filters.dataTypes.length +
    filters.tasks.length +
    filters.difficulties.length +
    filters.sizes.length +
    filters.formats.length +
    filters.geographies.length +
    (filters.apiKeyRequired !== null ? 1 : 0);

  return (
    <aside className="space-y-6 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold">Filters</h2>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(EMPTY_FILTERS)}
          >
            Clear
            <X />
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.query}
          onChange={(event) =>
            onChange({ ...filters, query: event.target.value })
          }
          placeholder="Search datasets…"
          className="pl-8"
          aria-label="Search datasets"
        />
      </div>

      {activeCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{activeCount} active</Badge>
        </div>
      )}

      <FilterGroup title="Domain">
        {options.domains.map((domain) => (
          <FilterCheckbox
            key={domain}
            label={domain}
            checked={filters.domains.includes(domain)}
            onCheckedChange={() =>
              onChange({
                ...filters,
                domains: toggleValue(filters.domains, domain),
              })
            }
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Data type">
        {options.dataTypes.map((dataType) => (
          <FilterCheckbox
            key={dataType}
            label={dataType}
            checked={filters.dataTypes.includes(dataType)}
            onCheckedChange={() =>
              onChange({
                ...filters,
                dataTypes: toggleValue(filters.dataTypes, dataType),
              })
            }
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Task">
        {options.tasks.map((task) => (
          <FilterCheckbox
            key={task}
            label={task}
            checked={filters.tasks.includes(task)}
            onCheckedChange={() =>
              onChange({
                ...filters,
                tasks: toggleValue(filters.tasks, task),
              })
            }
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Difficulty">
        {options.difficulties.map((difficulty) => (
          <FilterCheckbox
            key={difficulty}
            label={difficulty}
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

      <FilterGroup title="Size">
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

      <FilterGroup title="Format">
        {options.formats.map((format) => (
          <FilterCheckbox
            key={format}
            label={format}
            checked={filters.formats.includes(format)}
            onCheckedChange={() =>
              onChange({
                ...filters,
                formats: toggleValue(filters.formats, format),
              })
            }
          />
        ))}
      </FilterGroup>

      <FilterGroup title="API key required">
        <FilterCheckbox
          label="Yes"
          checked={filters.apiKeyRequired === true}
          onCheckedChange={(checked) =>
            onChange({
              ...filters,
              apiKeyRequired: checked ? true : null,
            })
          }
        />
        <FilterCheckbox
          label="No"
          checked={filters.apiKeyRequired === false}
          onCheckedChange={(checked) =>
            onChange({
              ...filters,
              apiKeyRequired: checked ? false : null,
            })
          }
        />
      </FilterGroup>

      <FilterGroup title="Geography">
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
    </aside>
  );
}
