import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-heading text-4xl font-bold text-white">Dataset not found</h1>
      <p className="mt-4 max-w-md leading-7 text-muted-foreground">
        That dataset is not in the catalog. It may have been renamed or removed.
      </p>
      <Link href="/" className={cn(buttonVariants(), "mt-7")}>
        Back to datasets
      </Link>
    </div>
  );
}
