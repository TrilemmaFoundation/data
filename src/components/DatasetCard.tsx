import Link from "next/link";
import { ArrowRight, KeyRound, Sparkles } from "lucide-react";
import type { CatalogDataset } from "@/lib/schema";
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
      className={cn(
        "group relative flex h-full flex-col border-white/10 bg-card/90 transition duration-200 [--card-spacing:--spacing(3)] hover:border-primary/50 hover:bg-card",
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
        <CardTitle className="pt-1 text-lg font-semibold text-balance text-white">
          <Link
            href={`/datasets/${dataset.id}`}
            className="rounded-sm after:absolute after:inset-0 after:z-10 after:content-[''] hover:text-primary"
          >
            {dataset.name}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-2 leading-5">{dataset.description}</CardDescription>
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

      <CardFooter className="border-white/10 bg-brand-black/25 px-4 py-2">
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
