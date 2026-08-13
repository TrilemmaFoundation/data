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
    theme: dataset.theme,
    provider: dataset.provider,
    access_type: dataset.access_type,
    update_frequency: dataset.update_frequency,
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
        <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
          {siteCopy.loadingLabel}
        </div>
      }
    >
      <DiscoveryView datasets={datasets} />
    </Suspense>
  );
}
