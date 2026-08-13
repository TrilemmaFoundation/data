"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { catalogCopy } from "@/content/site-copy";
import { cn } from "@/lib/utils";

function visiblePages(page: number, totalPages: number): Array<number | "ellipsis"> {
  const pages = Array.from(
    new Set([1, page - 1, page, page + 1, totalPages].filter((value) => value > 0 && value <= totalPages)),
  ).sort((a, b) => a - b);
  return pages.flatMap((value, index) =>
    index > 0 && value - pages[index - 1]! > 1 ? ["ellipsis", value] : [value],
  );
}

const controlClass =
  "inline-flex h-8 items-center justify-center rounded-[10px] border text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";

export function CatalogPagination({
  page,
  totalPages,
  start,
  end,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  start: number;
  end: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav
      className="mt-1.5 flex flex-col gap-1 border-t border-white/10 pt-1.5 lg:flex-row lg:items-center lg:justify-end"
      aria-label={catalogCopy.paginationLabel}
    >
      <p className="text-center text-xs text-muted-foreground lg:sr-only" aria-live="polite">
        {catalogCopy.pageStatus(page, totalPages, start, end, total)}
      </p>
      <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 sm:w-auto sm:grid-cols-[auto_minmax(16rem,max-content)_auto] sm:justify-end">
        <button
          type="button"
          className={cn(controlClass, "gap-1 border-white/15 px-2.5 text-white hover:border-primary/60")}
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" /> {catalogCopy.previousPageLabel}
        </button>
        <div className="flex min-w-0 items-center justify-center gap-1">
          {visiblePages(page, totalPages).map((item, index) =>
            item === "ellipsis" ? (
              <span key={`ellipsis-${index}`} className="grid h-8 min-w-5 place-items-center text-xs" aria-hidden="true">…</span>
            ) : (
              <button
                key={item}
                type="button"
                className={cn(
                  controlClass,
                  "min-w-8 px-2",
                  item === page
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-white/15 bg-card text-white hover:border-primary/60",
                )}
                aria-current={item === page ? "page" : undefined}
                aria-label={catalogCopy.pageLabel(item)}
                onClick={() => onPageChange(item)}
              >
                {item}
              </button>
            ),
          )}
        </div>
        <button
          type="button"
          className={cn(controlClass, "gap-1 border-white/15 px-2.5 text-white hover:border-primary/60")}
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {catalogCopy.nextPageLabel} <ChevronRight className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
