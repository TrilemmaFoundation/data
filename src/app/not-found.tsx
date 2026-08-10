import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-heading text-3xl font-semibold">Dataset not found</h1>
      <p className="text-muted-foreground">
        That dataset is not in the catalog. It may have been renamed or removed.
      </p>
      <Link href="/" className={cn(buttonVariants())}>
        Back to datasets
      </Link>
    </div>
  );
}
