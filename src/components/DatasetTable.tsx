"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown, KeyRound } from "lucide-react";
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
import { cn } from "@/lib/utils";

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
      className="inline-flex min-h-11 items-center gap-1.5 rounded-sm text-left hover:text-white"
      onClick={column.getToggleSortingHandler()}
      aria-label={tableCopy.sortBy(children, sorted)}
    >
      {children}
      {sorted === "asc" ? <ArrowUp aria-hidden="true" />
        : sorted === "desc" ? <ArrowDown aria-hidden="true" />
          : <ChevronsUpDown aria-hidden="true" />}
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
          <div className="min-w-72 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/datasets/${dataset.id}`}
                className="rounded-sm text-base font-semibold text-white hover:text-primary"
              >
                {dataset.name}
              </Link>
              {featured && <Badge variant="secondary">{datasetCardCopy.goodFirstBuildLabel}</Badge>}
            </div>
            <p className="mt-1 text-xs font-medium text-secondary">{dataset.provider}</p>
            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{dataset.description}</p>
          </div>
        );
      },
    }),
    columnHelper.accessor("theme", {
      id: "theme",
      sortFn: sortFn("theme"),
      header: ({ column }) => <SortableHeader column={column}>{tableCopy.themeLabel}</SortableHeader>,
      cell: ({ row }) => <Badge variant="outline" className="h-auto whitespace-normal">{row.original.theme}</Badge>,
    }),
    columnHelper.accessor(
      (dataset) => getDatasetAccessMethods(dataset).join("+"),
      {
        id: "access",
        sortFn: sortFn("access"),
        header: ({ column }) => <SortableHeader column={column}>{tableCopy.accessLabel}</SortableHeader>,
        cell: ({ row }) => {
          const dataset = row.original;
          const methods = getDatasetAccessMethods(dataset)
            .map((method) => method === "api" ? "API" : "Download")
            .join(" + ");
          return (
            <div className="min-w-28">
              <p className="font-medium text-white">{methods}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <KeyRound className="size-3.5 text-secondary" aria-hidden="true" />
                {dataset.api_key_required ? tableCopy.freeKeyLabel : tableCopy.noKeyLabel}
              </p>
            </div>
          );
        },
      },
    ),
    columnHelper.accessor("formats", {
      id: "formats",
      enableSorting: false,
      header: tableCopy.formatsLabel,
      cell: ({ row }) => {
        const formats = row.original.formats;
        return (
          <p className="min-w-24 text-sm text-white/85">
            {formats.slice(0, 2).join(", ")}
            {formats.length > 2 && (
              <span className="text-muted-foreground" aria-label={tableCopy.moreFormats(formats.length - 2)}>
                {` +${formats.length - 2}`}
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
      cell: ({ row }) => <span className="font-medium capitalize text-white/85">{row.original.difficulty}</span>,
    }),
    columnHelper.accessor("update_frequency", {
      id: "updates",
      sortFn: sortFn("updates"),
      header: ({ column }) => <SortableHeader column={column}>{tableCopy.updatesLabel}</SortableHeader>,
      cell: ({ row }) => <span className="font-medium capitalize text-white/85">{row.original.update_frequency}</span>,
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
    <div className="surface">
      <Table className="min-w-[950px] table-fixed">
        <TableCaption className="sr-only">{tableCopy.caption}</TableCaption>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    scope="col"
                    className={cn(
                      "sticky top-16 z-10 bg-card/95 backdrop-blur",
                      header.column.id === "name" && "w-[36%]",
                    )}
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
    </div>
  );
}
