import { Suspense } from "react";
import { getAllDatasets } from "@/lib/datasets";
import { DiscoveryView } from "@/components/DiscoveryView";
import { siteCopy } from "@/content/site-copy";
import type { CatalogDataset } from "@/lib/schema";

export default function HomePage() {
  const datasets: CatalogDataset[] = getAllDatasets().map((dataset) => ({
    id: dataset.id,
    name: dataset.name,
    description: dataset.description,
    provider: dataset.provider,
    domains: dataset.domains,
    tasks: dataset.tasks,
    data_types: dataset.data_types,
    formats: dataset.formats,
    difficulty: dataset.difficulty,
    geography: dataset.geography,
    size_gb_min: dataset.size_gb_min,
    size_gb_max: dataset.size_gb_max,
    api_key_required: dataset.api_key_required,
  }));

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 text-sm text-muted-foreground sm:px-6">
          {siteCopy.loadingLabel}
        </div>
      }
    >
      <DiscoveryView datasets={datasets} />
    </Suspense>
  );
}
