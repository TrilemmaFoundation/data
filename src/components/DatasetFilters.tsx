"use client";

import {
  EMPTY_FILTERS,
  type DatasetFilters as Filters,
  type FilterOptions,
} from "@/lib/search";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { filterCopy } from "@/content/site-copy";
import { cn } from "@/lib/utils";

type DatasetFiltersProps = {
  options: FilterOptions;
  filters: Filters;
  onChange: (filters: Filters) => void;
};

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
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
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] px-2 text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white">
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
      <span>{label}</span>
    </label>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  compact = false,
  className,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "min-w-0 font-semibold text-white",
        compact ? "flex-1 text-xs" : "block text-sm",
        className,
      )}
    >
      <span className={compact ? "sr-only" : "block"}>{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-11 w-full min-w-0 rounded-[10px] border border-white/15 bg-brand-black/70 text-sm font-medium text-white shadow-[0_4px_4px_rgba(10,10,20,0.3)]",
          compact ? "mt-0 px-2" : "mt-1.5 px-3",
        )}
      >
        {children}
      </select>
    </label>
  );
}

export function DatasetQuickFilters({
  options,
  filters,
  onChange,
  className,
  idPrefix,
  compact = false,
}: DatasetFiltersProps & { className?: string; idPrefix: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        compact
          ? "flex min-w-0 flex-1 gap-2"
          : "grid gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3",
        className,
      )}
    >
      <FilterSelect
        id={`${idPrefix}-dataset-theme`}
        label={filterCopy.themeLabel}
        compact={compact}
        value={filters.theme ?? ""}
        onChange={(theme) => onChange({
          ...filters,
          theme: (theme || null) as Filters["theme"],
        })}
      >
        <option value="">{filterCopy.allThemesLabel}</option>
        {options.themes.map((theme) => <option key={theme}>{theme}</option>)}
      </FilterSelect>

      <FilterSelect
        id={`${idPrefix}-dataset-difficulty`}
        label={filterCopy.difficultyLabel}
        compact={compact}
        value={filters.difficulty ?? ""}
        onChange={(difficulty) => onChange({
          ...filters,
          difficulty: (difficulty || null) as Filters["difficulty"],
        })}
      >
        <option value="">{filterCopy.allDifficultiesLabel}</option>
        {options.difficulties.map((difficulty) => (
          <option key={difficulty} value={difficulty}>
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        id={`${idPrefix}-dataset-access`}
        label={compact ? filterCopy.accessMethodShortLabel : filterCopy.accessMethodLabel}
        compact={compact}
        className={compact ? "max-xl:hidden" : undefined}
        value={filters.accessMethod ?? ""}
        onChange={(accessMethod) => onChange({
          ...filters,
          accessMethod: (accessMethod || null) as Filters["accessMethod"],
        })}
      >
        <option value="">{filterCopy.allAccessMethodsLabel}</option>
        {options.accessMethods.map((method) => (
          <option key={method} value={method}>
            {method === "api" ? "API" : "Download"}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        id={`${idPrefix}-dataset-api-key`}
        label={compact ? filterCopy.apiKeyShortLabel : filterCopy.apiKeyLabel}
        compact={compact}
        className={compact ? "max-xl:hidden" : undefined}
        value={filters.apiKeyRequired === null ? "" : String(filters.apiKeyRequired)}
        onChange={(value) => onChange({
          ...filters,
          apiKeyRequired: value === "true" ? true : value === "false" ? false : null,
        })}
      >
        <option value="">{filterCopy.anyApiKeyLabel}</option>
        <option value="false">{filterCopy.noLabel}</option>
        <option value="true">{filterCopy.yesLabel}</option>
      </FilterSelect>
    </div>
  );
}

function AdvancedGroup({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-lg border border-white/10 bg-brand-black/25 p-4">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-sm text-sm font-semibold text-white marker:content-none">
        <span>{title}{count > 0 ? ` (${count})` : ""}</span>
        <span aria-hidden="true" className="text-lg text-primary transition-transform group-open:rotate-45">+</span>
      </summary>
      <fieldset className="mt-4 border-t border-white/10 pt-3">
        <legend className="sr-only">{title}</legend>
        <div className="space-y-1">{children}</div>
      </fieldset>
    </details>
  );
}

export function DatasetFilters({ options, filters, onChange }: DatasetFiltersProps) {
  const hasActiveFilters = Object.entries(filters).some(([key, value]) =>
    key === "query" ? value !== "" : Array.isArray(value) ? value.length > 0 : value !== null,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">
          {filterCopy.advancedFiltersLabel}
        </p>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasActiveFilters}
          onClick={() => onChange(EMPTY_FILTERS)}
        >
          {filterCopy.clearAllLabel}
        </Button>
      </div>

      <AdvancedGroup title={filterCopy.dataTypeLabel} count={filters.dataTypes.length}>
        {options.dataTypes.map((dataType) => (
          <FilterCheckbox
            key={dataType}
            label={dataType}
            checked={filters.dataTypes.includes(dataType)}
            onCheckedChange={() => onChange({
              ...filters,
              dataTypes: toggleValue(filters.dataTypes, dataType),
            })}
          />
        ))}
      </AdvancedGroup>

      <AdvancedGroup title={filterCopy.domainLabel} count={filters.domains.length}>
        {options.domains.map((domain) => (
          <FilterCheckbox
            key={domain}
            label={domain}
            checked={filters.domains.includes(domain)}
            onCheckedChange={() => onChange({
              ...filters,
              domains: toggleValue(filters.domains, domain),
            })}
          />
        ))}
      </AdvancedGroup>

      <AdvancedGroup title={filterCopy.taskLabel} count={filters.tasks.length}>
        {options.tasks.map((task) => (
          <FilterCheckbox
            key={task}
            label={task}
            checked={filters.tasks.includes(task)}
            onCheckedChange={() => onChange({
              ...filters,
              tasks: toggleValue(filters.tasks, task),
            })}
          />
        ))}
      </AdvancedGroup>

      <AdvancedGroup title={filterCopy.sizeLabel} count={filters.sizes.length}>
        {options.sizes.map((size) => (
          <FilterCheckbox
            key={size}
            label={size}
            checked={filters.sizes.includes(size)}
            onCheckedChange={() => onChange({
              ...filters,
              sizes: toggleValue(filters.sizes, size),
            })}
          />
        ))}
      </AdvancedGroup>

      <AdvancedGroup title={filterCopy.formatLabel} count={filters.formats.length}>
        {options.formats.map((format) => (
          <FilterCheckbox
            key={format}
            label={format}
            checked={filters.formats.includes(format)}
            onCheckedChange={() => onChange({
              ...filters,
              formats: toggleValue(filters.formats, format),
            })}
          />
        ))}
      </AdvancedGroup>

      <AdvancedGroup title={filterCopy.geographyLabel} count={filters.geographies.length}>
        {options.geographies.map((geography) => (
          <FilterCheckbox
            key={geography}
            label={geography}
            checked={filters.geographies.includes(geography)}
            onCheckedChange={() => onChange({
              ...filters,
              geographies: toggleValue(filters.geographies, geography),
            })}
          />
        ))}
      </AdvancedGroup>
    </div>
  );
}
