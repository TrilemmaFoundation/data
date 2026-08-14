import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

type CheckboxProps = Omit<ComponentProps<"input">, "type" | "onChange"> & {
  onCheckedChange?: (checked: boolean) => void;
};

function Checkbox({ className, onCheckedChange, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      className={cn(
        "size-4 shrink-0 cursor-pointer accent-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onChange={(event) => onCheckedChange?.(event.currentTarget.checked)}
      {...props}
    />
  )
}

export { Checkbox }
