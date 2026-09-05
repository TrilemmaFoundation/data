import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { notFoundCopy } from "@/content/site-copy";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="eyebrow">{notFoundCopy.eyebrow}</p>
      <h1 className="mt-3 font-heading text-3xl font-bold text-foreground sm:text-4xl">
        {notFoundCopy.title}
      </h1>
      <p className="mt-4 max-w-md leading-7 text-muted-foreground">
        {notFoundCopy.description}
      </p>
      <Link href="/" className={cn(buttonVariants(), "mt-7")}>
        {notFoundCopy.backLabel}
      </Link>
    </div>
  );
}
