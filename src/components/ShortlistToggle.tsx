"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useShortlist } from "@/components/ShortlistProvider";
import { Button } from "@/components/ui/button";
import { shortlistCopy } from "@/content/site-copy";
import { MAX_SHORTLIST } from "@/lib/shortlist";
import { cn } from "@/lib/utils";

export function ShortlistToggle({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const { ids, toggle } = useShortlist();
  const selected = ids.includes(id);
  const full = !selected && ids.length >= MAX_SHORTLIST;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("relative z-20", className)}
      aria-pressed={selected}
      disabled={full}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(id);
      }}
    >
      {selected ? <BookmarkCheck aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
      {selected
        ? shortlistCopy.removeLabel
        : full
          ? shortlistCopy.fullLabel
          : shortlistCopy.addLabel}
    </Button>
  );
}
