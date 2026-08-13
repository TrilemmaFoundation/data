"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <nav className="mt-6" aria-label={catalogCopy.paginationLabel}>
      <p className="text-center text-sm text-muted-foreground" aria-live="polite">
        {catalogCopy.pageStatus(page, totalPages, start, end, total)}
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Button variant="outline" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft aria-hidden="true" /> {catalogCopy.previousPageLabel}
        </Button>
        {visiblePages(page, totalPages).map((item, index) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="grid min-h-11 min-w-8 place-items-center" aria-hidden="true">…</span>
          ) : (
            <button
              key={item}
              type="button"
              className={cn(
                "min-h-11 min-w-11 rounded-[10px] border px-3 font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
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
        <Button variant="outline" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
          {catalogCopy.nextPageLabel} <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
