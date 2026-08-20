import Link from "next/link";
import { ArrowRight, KeyRound, Sparkles } from "lucide-react";
import type { CatalogDataset } from "@/lib/schema";
import { toChicagoTitleCase } from "@/lib/chicago-title-case";
import { getSizeCategory } from "@/lib/size";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { datasetCardCopy, tableCopy } from "@/content/site-copy";

export function DatasetCard({
  dataset,
  featured = false,
}: {
  dataset: CatalogDataset;
  featured?: boolean;
}) {
  const sizeCategory = getSizeCategory(dataset.size_gb_max);

  return (
    <Card
      data-catalog-card
      className={cn(
        "group relative flex h-full flex-col border-white/10 bg-card/90 transition duration-200 [--card-spacing:--spacing(3)] hover:border-primary/50 hover:bg-card",
        featured && "border-primary/50",
      )}
    >
      <Link
        href={`/datasets/${dataset.id}`}
        className="absolute inset-0 z-10 rounded-[inherit]"
      >
        <span className="sr-only">{dataset.name}</span>
      </Link>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <Badge variant="secondary" className="capitalize text-secondary">
            {dataset.difficulty === "beginner" && (
              <Sparkles className="text-secondary" aria-hidden="true" />
            )}
            {toChicagoTitleCase(dataset.difficulty)}
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
        <CardTitle
          aria-hidden="true"
          className="pt-1 text-lg font-semibold text-balance text-white group-hover:text-primary"
        >
          {dataset.name}
        </CardTitle>
        <CardDescription className="line-clamp-2 leading-5">{dataset.description}</CardDescription>
        <p className="line-clamp-2 text-xs leading-5 text-secondary">
          <span className="font-semibold text-white/80">{datasetCardCopy.firstProjectLabel}: </span>
          {dataset.first_project_title}
        </p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-end">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <Badge variant="outline" className="rounded-full" title={dataset.theme}>
            {tableCopy.themeShort[dataset.theme]}
          </Badge>
          <span className="whitespace-nowrap text-white/80">
            {dataset.formats[0]}
            {dataset.formats.length > 1 ? ` +${dataset.formats.length - 1}` : ""}
          </span>
          <span
            className="ml-auto flex items-center gap-1 whitespace-nowrap text-muted-foreground"
            title={datasetCardCopy.apiKeyStatus(dataset.api_key_required)}
          >
            <KeyRound className="size-3.5 text-secondary" aria-hidden="true" />
            {dataset.api_key_required ? tableCopy.freeKeyLabel : tableCopy.noKeyLabel}
          </span>
        </div>
      </CardContent>

      <CardFooter className="items-center border-white/10 bg-brand-black/25 px-4 py-2">
        <p
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors group-hover:text-white"
          aria-hidden="true"
        >
          {datasetCardCopy.viewGuideLabel} <ArrowRight aria-hidden="true" />
        </p>
      </CardFooter>
    </Card>
  );
}
