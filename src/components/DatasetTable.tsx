"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, KeyRound } from "lucide-react";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type Column,
  type SortingState,
} from "@tanstack/react-table";
import type { CatalogDataset } from "@/lib/schema";
import {
  compareDatasets,
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

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});
const columnHelper = createColumnHelper<typeof features, CatalogDataset>();

function SortableHeader<TValue>({
  column,
  children,
}: {
  column: Column<typeof features, CatalogDataset, TValue>;
  children: string;
}) {
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      className="inline-flex min-h-8 items-center gap-1 rounded-sm text-left hover:text-white"
      onClick={column.getToggleSortingHandler()}
      aria-label={tableCopy.sortBy(children, sorted)}
    >
      {children}
      {sorted === "asc" ? <ArrowUp className="size-3.5" aria-hidden="true" />
        : sorted === "desc" ? <ArrowDown className="size-3.5" aria-hidden="true" />
          : <ArrowUpDown className="size-3.5 text-white/50" aria-hidden="true" />}
    </button>
  );
}

function sortFn(column: SortColumn) {
  return (a: { original: CatalogDataset }, b: { original: CatalogDataset }) =>
    compareDatasets(a.original, b.original, column);
}

export function DatasetTable({
  datasets,
  sort,
  onSortChange,
  featuredId,
}: {
  datasets: CatalogDataset[];
  sort: CatalogSort;
  onSortChange: (sort: CatalogSort) => void;
  featuredId?: string;
}) {
  const columns = useMemo(() => columnHelper.columns([
    columnHelper.accessor("name", {
      id: "name",
      sortFn: sortFn("name"),
      header: ({ column }) => <SortableHeader column={column}>{tableCopy.datasetLabel}</SortableHeader>,
      cell: ({ row }) => {
        const dataset = row.original;
        const featured = dataset.id === featuredId;
        return (
          <div className="flex min-w-0 items-center gap-1.5">
            <Link
              href={`/datasets/${dataset.id}`}
              className="min-w-0 truncate whitespace-nowrap rounded-sm text-[0.9375rem] font-semibold text-white hover:text-primary"
              title={`${dataset.description} — ${dataset.provider}`}
            >
              {dataset.name}
              <span className="font-normal text-xs text-secondary"> · {dataset.provider}</span>
            </Link>
            {featured && (
              <Badge variant="secondary" className="shrink-0">
                {datasetCardCopy.goodFirstBuildLabel}
              </Badge>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor("theme", {
      id: "theme",
      sortFn: sortFn("theme"),
      header: ({ column }) => <SortableHeader column={column}>{tableCopy.themeLabel}</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-xs whitespace-nowrap text-white/75" title={row.original.theme}>
          {tableCopy.themeShort[row.original.theme]}
        </span>
      ),
    }),
    columnHelper.accessor(
      (dataset) => getDatasetAccessMethods(dataset).join("+"),
      {
        id: "access",
        sortFn: sortFn("access"),
        header: ({ column }) => <SortableHeader column={column}>{tableCopy.accessLabel}</SortableHeader>,
        cell: ({ row }) => {
          const dataset = row.original;
          const methods = getDatasetAccessMethods(dataset);
          const access = methods.length > 1
            ? tableCopy.accessBothLabel
            : methods[0] === "api"
              ? tableCopy.accessApiLabel
              : tableCopy.accessDownloadLabel;
          const key = dataset.api_key_required ? tableCopy.freeKeyLabel : tableCopy.noKeyLabel;
          return (
            <p className="flex items-center gap-1 text-xs whitespace-nowrap text-white">
              <span className="font-medium">{access}</span>
              <span className="text-white/40" aria-hidden="true">·</span>
              <KeyRound className="size-3 shrink-0 text-secondary" aria-hidden="true" />
              <span className="text-muted-foreground">{key}</span>
            </p>
          );
        },
      },
    ),
    columnHelper.accessor("formats", {
      id: "formats",
      enableSorting: false,
      header: () => (
        <span className="inline-flex min-h-8 items-center">{tableCopy.formatsLabel}</span>
      ),
      cell: ({ row }) => {
        const formats = row.original.formats;
        return (
          <p className="text-xs whitespace-nowrap text-white/85">
            {formats[0]}
            {formats.length > 1 && (
              <span className="text-muted-foreground" aria-label={tableCopy.moreFormats(formats.length - 1)}>
                {` +${formats.length - 1}`}
              </span>
            )}
          </p>
        );
      },
    }),
    columnHelper.accessor("difficulty", {
      id: "difficulty",
      sortFn: sortFn("difficulty"),
      header: ({ column }) => <SortableHeader column={column}>{tableCopy.difficultyLabel}</SortableHeader>,
      cell: ({ row }) => <span className="text-xs font-medium capitalize whitespace-nowrap text-white/85">{row.original.difficulty}</span>,
    }),
    columnHelper.accessor("update_frequency", {
      id: "updates",
      sortFn: sortFn("updates"),
      header: ({ column }) => <SortableHeader column={column}>{tableCopy.updatesLabel}</SortableHeader>,
      cell: ({ row }) => <span className="text-xs font-medium capitalize whitespace-nowrap text-white/85">{row.original.update_frequency}</span>,
    }),
  ]), [featuredId]);

  const sorting: SortingState = sort ? [{ id: sort.id, desc: sort.desc }] : [];
  const table = useTable({
    features,
    data: datasets,
    columns,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const first = next[0];
      onSortChange(first ? { id: first.id as SortColumn, desc: first.desc } : null);
    },
    enableSortingRemoval: true,
    sortDescFirst: false,
  });

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
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id} className="hover:bg-transparent">
            {headerGroup.headers.map((header) => {
              const sorted = header.column.getIsSorted();
              return (
                <TableHead
                  key={header.id}
                  scope="col"
                  className="sticky top-16 z-[1] bg-card"
                  aria-sort={sorted ? sorted === "asc" ? "ascending" : "descending" : undefined}
                >
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell key={cell.id}><table.FlexRender cell={cell} /></TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
