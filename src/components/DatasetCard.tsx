import Link from "next/link";
import { ArrowRight, KeyRound, Sparkles } from "lucide-react";
import type { CatalogDataset } from "@/lib/schema";
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
import { datasetCardCopy } from "@/content/site-copy";

export function DatasetCard({
  dataset,
  featured = false,
}: {
  dataset: CatalogDataset;
  featured?: boolean;
}) {
  const sizeCategory = getSizeCategory(dataset.size_gb_max);
  const sizeRange = formatSizeRange(dataset.size_gb_min, dataset.size_gb_max);

  return (
    <Card
      className={cn(
        "group flex h-full flex-col border-white/10 bg-card/90 transition duration-200 hover:border-primary/50 hover:bg-card",
        featured && "border-primary/50",
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <Badge variant="secondary" className="capitalize">
            {dataset.difficulty === "beginner" && <Sparkles aria-hidden="true" />}
            {dataset.difficulty}
          </Badge>
          <span
            className={cn(
              "text-xs font-medium",
              featured ? "font-bold text-primary" : "text-muted-foreground",
            )}
          >
            {featured ? datasetCardCopy.goodFirstBuildLabel : sizeCategory}
          </span>
        </div>
        <CardTitle className="pt-2 text-xl font-semibold text-white">
          <Link href={`/datasets/${dataset.id}`} className="rounded-sm hover:text-primary">
            {dataset.name}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-3 leading-6">{dataset.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-5">
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-white/8 bg-brand-black/25 p-3 text-xs">
          <div>
            <p className="text-muted-foreground">{datasetCardCopy.sizeLabel}</p>
            <p className="mt-1 font-medium text-white">{sizeRange}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{datasetCardCopy.formatLabel}</p>
            <p className="mt-1 font-medium text-white">{dataset.formats.join(", ")}</p>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap gap-1.5">
            {dataset.domains.map((domain) => (
              <Badge key={domain} variant="outline" className="rounded-full">
                {domain}
              </Badge>
            ))}
          </div>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {dataset.tasks.join(" · ")}
          </p>
        </div>

        <p className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
          <KeyRound className="size-3.5 text-secondary" aria-hidden="true" />
          {datasetCardCopy.apiKeyStatus(dataset.api_key_required)}
        </p>
      </CardContent>

      <CardFooter className="border-white/10 bg-brand-black/25">
        <Link href={`/datasets/${dataset.id}`} className={cn(buttonVariants(), "w-full")}>
          {datasetCardCopy.viewGuideLabel} <ArrowRight aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}
