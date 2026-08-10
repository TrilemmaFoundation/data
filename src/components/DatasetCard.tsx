import Link from "next/link";
import { ArrowRight, KeyRound, Sparkles } from "lucide-react";
import type { Dataset } from "@/lib/schema";
import { formatSizeRange, getSizeCategory } from "@/lib/size";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function DatasetCard({ dataset }: { dataset: Dataset }) {
  const sizeCategory = getSizeCategory(dataset.size_gb_max);
  const sizeRange = formatSizeRange(dataset.size_gb_min, dataset.size_gb_max);

  return (
    <Card className="group flex h-full flex-col border-white/10 bg-card/90 transition duration-200 hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <Badge variant="secondary" className="capitalize">
            {dataset.difficulty === "beginner" && <Sparkles aria-hidden="true" />}
            {dataset.difficulty}
          </Badge>
          <span className="text-xs font-medium text-muted-foreground">{sizeCategory}</span>
        </div>
        <CardTitle className="pt-2 text-xl font-semibold text-white">
          <Link href={`/datasets/${dataset.id}`} className="rounded-sm hover:text-primary">
            {dataset.name}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-3 leading-6">{dataset.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-5">
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-3 text-xs">
          <div>
            <p className="text-muted-foreground">Size</p>
            <p className="mt-1 font-medium text-white">{sizeRange}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Format</p>
            <p className="mt-1 font-medium text-white">{dataset.formats.join(", ")}</p>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap gap-1.5">
            {dataset.domains.map((domain) => (
              <Badge key={domain} variant="outline">{domain}</Badge>
            ))}
          </div>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {dataset.tasks.join(" · ")}
          </p>
        </div>

        <p className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
          <KeyRound className="size-3.5 text-secondary" aria-hidden="true" />
          {dataset.api_key_required ? "Free API key required" : "No API key required"}
        </p>
      </CardContent>

      <CardFooter className="border-white/10 bg-white/[0.025]">
        <Link href={`/datasets/${dataset.id}`} className={cn(buttonVariants(), "w-full")}>
          View guide <ArrowRight aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}
