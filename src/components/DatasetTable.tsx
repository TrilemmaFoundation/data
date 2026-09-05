"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, KeyRound } from "lucide-react";
import { toChicagoTitleCase } from "@/lib/chicago-title-case";
import type { CatalogDataset } from "@/lib/schema";
import {
  getDatasetAccessMethods,
  type CatalogSort,
  type SortColumn,
} from "@/lib/search";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { datasetCardCopy, tableCopy } from "@/content/site-copy";

const SORT_HEADERS: Array<{ id: SortColumn; label: string }> = [
  { id: "name", label: tableCopy.datasetLabel },
  { id: "theme", label: tableCopy.themeLabel },
  { id: "access", label: tableCopy.accessLabel },
  { id: "difficulty", label: tableCopy.difficultyLabel },
  { id: "updates", label: tableCopy.updatesLabel },
];

function sortState(sort: CatalogSort, column: SortColumn): false | "asc" | "desc" {
  if (!sort || sort.id !== column) return false;
  return sort.desc ? "desc" : "asc";
}

function nextSort(column: SortColumn, current: CatalogSort): CatalogSort {
  if (!current || current.id !== column) return { id: column, desc: false };
  if (!current.desc) return { id: column, desc: true };
  return null;
}

function SortHeader({
  column,
  label,
  sort,
  onSortChange,
}: {
  column: SortColumn;
  label: string;
  sort: CatalogSort;
  onSortChange: (sort: CatalogSort) => void;
}) {
  const sorted = sortState(sort, column);
  return (
    <TableHead
      scope="col"
      className="sticky top-[var(--foundation-shell-height,116px)] z-[1] bg-card"
      aria-sort={sorted ? sorted === "asc" ? "ascending" : "descending" : undefined}
    >
      <button
        type="button"
        className="inline-flex min-h-8 items-center gap-1 rounded-sm text-left uppercase hover:text-foreground"
        onClick={() => onSortChange(nextSort(column, sort))}
        aria-label={tableCopy.sortBy(label, sorted)}
      >
        {label}
        {sorted === "asc" ? <ArrowUp className="size-3.5" aria-hidden="true" />
          : sorted === "desc" ? <ArrowDown className="size-3.5" aria-hidden="true" />
            : <ArrowUpDown className="size-3.5 text-muted-foreground" aria-hidden="true" />}
      </button>
    </TableHead>
  );
}

function accessLabel(dataset: CatalogDataset) {
  const methods = getDatasetAccessMethods(dataset);
  if (methods.length > 1) return tableCopy.accessBothLabel;
  return methods[0] === "api" ? tableCopy.accessApiLabel : tableCopy.accessDownloadLabel;
}

export function DatasetTable({
  datasets,
  sort,
  onSortChange,
  featuredId,
  featuredIds = [],
}: {
  datasets: CatalogDataset[];
  sort: CatalogSort;
  onSortChange: (sort: CatalogSort) => void;
  featuredId?: string;
  featuredIds?: string[];
}) {
  const featured = new Set(featuredIds);
  if (featuredId) featured.add(featuredId);
  return (
    <Table className="table-fixed">
      <TableCaption className="sr-only">{tableCopy.caption}</TableCaption>
      <colgroup>
        <col style={{ width: "38%" }} />
        <col style={{ width: "14%" }} />
        <col style={{ width: "14%" }} />
        <col style={{ width: "14%" }} />
        <col style={{ width: "10%" }} />
        <col style={{ width: "10%" }} />
      </colgroup>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {SORT_HEADERS.slice(0, 3).map((column) => (
            <SortHeader
              key={column.id}
              column={column.id}
              label={column.label}
              sort={sort}
              onSortChange={onSortChange}
            />
          ))}
          <TableHead scope="col" className="sticky top-[var(--foundation-shell-height,116px)] z-[1] bg-card">
            <span className="inline-flex min-h-8 items-center">{tableCopy.formatsLabel}</span>
          </TableHead>
          {SORT_HEADERS.slice(3).map((column) => (
            <SortHeader
              key={column.id}
              column={column.id}
              label={column.label}
              sort={sort}
              onSortChange={onSortChange}
            />
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {datasets.map((dataset) => {
          const isFeatured = featured.has(dataset.id);
          const formats = dataset.formats;
          return (
            <TableRow key={dataset.id}>
              <TableCell>
                <div className="flex min-w-0 items-start gap-1.5">
                  <Link
                    href={`/datasets/${dataset.id}`}
                    className="min-w-0 rounded-sm text-[0.9375rem] leading-snug font-semibold text-foreground hover:text-link"
                    title={`${dataset.description} — ${dataset.provider}`}
                  >
                    <span className="block truncate">{dataset.name}</span>
                    <span
                      className="block truncate text-xs font-normal leading-4 text-muted-foreground"
                      aria-hidden="true"
                    >
                      {dataset.first_project_title}
                    </span>
                  </Link>
                  {isFeatured && (
                    <Badge variant="secondary" className="shrink-0">
                      {datasetCardCopy.goodFirstBuildLabel}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-xs whitespace-nowrap text-muted-foreground" title={dataset.theme}>
                  {tableCopy.themeShort[dataset.theme]}
                </span>
              </TableCell>
              <TableCell>
                <p className="flex items-center gap-1 text-xs whitespace-nowrap text-foreground">
                  <span className="font-medium">{accessLabel(dataset)}</span>
                  <span className="text-muted-foreground" aria-hidden="true">·</span>
                  <KeyRound className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="text-muted-foreground">
                    {dataset.api_key_required ? tableCopy.freeKeyLabel : tableCopy.noKeyLabel}
                  </span>
                </p>
              </TableCell>
              <TableCell>
                <p className="text-xs whitespace-nowrap text-muted-foreground">
                  {formats[0]}
                  {formats.length > 1 && (
                    <span className="text-muted-foreground" aria-label={tableCopy.moreFormats(formats.length - 1)}>
                      {` +${formats.length - 1}`}
                    </span>
                  )}
                </p>
              </TableCell>
              <TableCell>
                <span className="text-xs font-medium whitespace-nowrap text-muted-foreground">
                  {toChicagoTitleCase(dataset.difficulty)}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-xs font-medium whitespace-nowrap text-muted-foreground">
                  {toChicagoTitleCase(dataset.update_frequency)}
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
