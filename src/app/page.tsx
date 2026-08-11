import { Suspense } from "react";
import { getAllDatasets } from "@/lib/datasets";
import { DiscoveryView } from "@/components/DiscoveryView";
import { siteCopy } from "@/content/site-copy";

export default function HomePage() {
  const datasets = getAllDatasets();

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
