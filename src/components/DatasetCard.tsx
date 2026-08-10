import Link from "next/link";
import { ExternalLink, Network } from "lucide-react";
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

type DatasetCardProps = {
  dataset: Dataset;
};

export function DatasetCard({ dataset }: DatasetCardProps) {
  const sizeCategory = getSizeCategory(dataset.size_gb_max);
  const sizeRange = formatSizeRange(dataset.size_gb_min, dataset.size_gb_max);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-xl">
            <Link
              href={`/datasets/${dataset.id}`}
              className="hover:underline"
            >
              {dataset.name}
            </Link>
          </CardTitle>
          <Badge variant="secondary" className="shrink-0 capitalize">
            {dataset.difficulty}
          </Badge>
        </div>
        <CardDescription className="line-clamp-3">
          {dataset.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">
            {sizeCategory}
            <span className="ml-1 opacity-80">{sizeRange}</span>
          </Badge>
          <span>
            {dataset.data_types.join(" · ")} · {dataset.formats.join(", ")}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant={dataset.free_to_access ? "default" : "destructive"}>
            Free {dataset.free_to_access ? "✓" : "✗"}
          </Badge>
          <Badge variant="outline">
            API key {dataset.api_key_required ? "✓" : "✗"}
          </Badge>
          <Badge variant="outline">{dataset.license}</Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-1.5">
            {dataset.domains.map((domain) => (
              <Badge key={domain} variant="secondary">
                {domain}
              </Badge>
            ))}
          </div>
          <p className="text-muted-foreground">{dataset.tasks.join(" · ")}</p>
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        <a
          href={dataset.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants())}
        >
          Open Dataset
          <ExternalLink />
        </a>
        <Link
          href={`/graph?dataset=${dataset.id}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Explore Graph
          <Network />
        </Link>
      </CardFooter>
    </Card>
  );
}
