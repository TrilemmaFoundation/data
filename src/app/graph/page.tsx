import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllDatasets } from "@/lib/datasets";
import { buildGraph } from "@/lib/graph";
import { GraphExplorer } from "@/components/GraphExplorer";

export const metadata: Metadata = {
  title: "Connections",
  description:
    "Explore accessible relationships between datasets, domains, data types, tasks, and providers.",
  alternates: { canonical: "/graph" },
  openGraph: {
    title: "Dataset Connections",
    description:
      "Explore accessible relationships between datasets, domains, data types, tasks, and providers.",
    url: "/graph",
  },
};

export default function GraphPage() {
  const datasets = getAllDatasets();
  const fullGraph = buildGraph(datasets);

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 text-sm text-muted-foreground sm:px-6">
          Preparing connections…
        </div>
      }
    >
      <GraphExplorer datasets={datasets} fullGraph={fullGraph} />
    </Suspense>
  );
}
