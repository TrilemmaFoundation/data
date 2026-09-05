import type { ComponentProps } from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-[var(--tf-radius-button)] border border-brand-black bg-clip-padding text-base font-bold whitespace-normal text-center shadow-[0_4px_4px_0_#0a0a14] transition-[background-color,color,box-shadow,transform] duration-150 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-link hover:text-[var(--tf-ghost-white)]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-[var(--tf-digital-amber)]",
        quiet: "bg-transparent text-link shadow-none hover:bg-accent/15",
        default: "bg-primary text-primary-foreground hover:bg-link hover:text-[var(--tf-ghost-white)]",
        outline:
          "border-brand-black bg-secondary text-secondary-foreground hover:bg-[var(--tf-digital-amber)] aria-expanded:bg-muted aria-expanded:text-foreground",
        ghost:
          "border-transparent bg-transparent text-muted-foreground shadow-none hover:bg-accent/10 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
      },
      size: {
        default: "min-h-11 gap-2 px-5 py-2",
        sm: "min-h-11 gap-1.5 px-3 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "min-h-13 gap-2 px-5 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      type="button"
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
