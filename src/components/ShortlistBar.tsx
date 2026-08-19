"use client";

import Link from "next/link";
import { useShortlist } from "@/components/ShortlistProvider";
import { Button, buttonVariants } from "@/components/ui/button";
import { shortlistCopy } from "@/content/site-copy";
import { canCompare, compareHref } from "@/lib/shortlist";
import { cn } from "@/lib/utils";

export function ShortlistBar() {
  const { ids, clear } = useShortlist();
  if (ids.length === 0) return null;

  return (
    <div
      className="sticky bottom-0 z-40 border-t border-white/15 bg-brand-black/95 px-4 py-3 backdrop-blur sm:px-6"
      role="region"
      aria-label={shortlistCopy.barLabel}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3">
        <p className="text-sm font-medium text-white">{shortlistCopy.countLabel(ids.length)}</p>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link
            href={compareHref(ids)}
            className={cn(buttonVariants({ size: "sm" }), !canCompare(ids) && "pointer-events-none opacity-50")}
            aria-disabled={!canCompare(ids)}
          >
            {shortlistCopy.compareLabel}
          </Link>
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            {shortlistCopy.clearLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
