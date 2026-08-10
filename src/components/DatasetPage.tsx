import Link from "next/link";
import { ExternalLink, Network } from "lucide-react";
import type { Dataset } from "@/lib/schema";
import type { KnowledgeGraph } from "@/lib/graph";
import { formatSizeRange, getSizeCategory } from "@/lib/size";
import { DatasetGraph } from "@/components/DatasetGraph";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DatasetPageProps = {
  dataset: Dataset;
  graph: KnowledgeGraph;
  datasets: Dataset[];
};

function ConceptPills({
  label,
  type,
  values,
}: {
  label: string;
  type: string;
  values: string[];
}) {
  return (
    <div>
      <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <Link
            key={value}
            href={`/graph?focus=${encodeURIComponent(`${type}:${value}`)}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {value}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function DatasetPage({ dataset, graph, datasets }: DatasetPageProps) {
  const sizeCategory = getSizeCategory(dataset.size_gb_max);
  const sizeRange = formatSizeRange(dataset.size_gb_min, dataset.size_gb_max);
  const focusId = `dataset:${dataset.id}`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-10 sm:px-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Datasets
          </Link>
          <span>/</span>
          <span>{dataset.name}</span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              {dataset.name}
            </h1>
            <p className="max-w-3xl text-muted-foreground">
              {dataset.description}
            </p>
          </div>
          <Badge variant="secondary" className="capitalize">
            {dataset.difficulty}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {sizeCategory} · {sizeRange}
          </Badge>
          <Badge variant="outline">
            {dataset.data_types.join(" · ")}
          </Badge>
          <Badge variant="outline">{dataset.formats.join(", ")}</Badge>
          <Badge>Free ✓</Badge>
          <Badge variant="outline">
            API key {dataset.api_key_required ? "✓" : "✗"}
          </Badge>
          <Badge variant="outline">{dataset.license}</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
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
        </div>
      </div>

      <section className="grid gap-6 rounded-xl border bg-card p-6 md:grid-cols-2">
        <div className="space-y-4 text-sm">
          <div>
            <h2 className="font-medium text-muted-foreground">Provider</h2>
            <p className="mt-1">
              <Link
                href={`/graph?focus=${encodeURIComponent(`provider:${dataset.provider}`)}`}
                className="text-primary hover:underline"
              >
                {dataset.provider}
              </Link>{" "}
              <span className="text-muted-foreground">
                ({dataset.source_type})
              </span>
            </p>
          </div>
          <div>
            <h2 className="font-medium text-muted-foreground">Access</h2>
            <p className="mt-1 capitalize">{dataset.access_type.join(", ")}</p>
          </div>
          <div>
            <h2 className="font-medium text-muted-foreground">
              Temporal coverage
            </h2>
            <p className="mt-1">{dataset.temporal_coverage ?? "Not applicable"}</p>
          </div>
          <div>
            <h2 className="font-medium text-muted-foreground">
              Update frequency
            </h2>
            <p className="mt-1 capitalize">{dataset.update_frequency}</p>
          </div>
          <div>
            <h2 className="font-medium text-muted-foreground">Last verified</h2>
            <p className="mt-1">{dataset.last_verified}</p>
          </div>
          <div>
            <h2 className="font-medium text-muted-foreground">License</h2>
            <p className="mt-1">
              <a
                href={dataset.license_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {dataset.license}
              </a>
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <ConceptPills label="Domains" type="domain" values={dataset.domains} />
          <ConceptPills
            label="Data types"
            type="dataType"
            values={dataset.data_types}
          />
          <ConceptPills label="Tasks" type="task" values={dataset.tasks} />
          <ConceptPills
            label="Geography"
            type="geography"
            values={dataset.geography}
          />
          <ConceptPills label="Formats" type="format" values={dataset.formats} />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-xl font-semibold">
            Knowledge graph neighborhood
          </h2>
          <p className="text-sm text-muted-foreground">
            One hop from {dataset.name} across domains, types, tasks, and more.
          </p>
        </div>
        <DatasetGraph
          key={focusId}
          graph={graph}
          datasets={datasets}
          focusId={focusId}
          height={480}
        />
      </section>
    </div>
  );
}
