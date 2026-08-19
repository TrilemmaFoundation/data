import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Expands a nested link's hit target to a `relative` ancestor. */
export const stretchedLinkClassName =
  "after:absolute after:inset-0 after:z-10 after:content-['']";
