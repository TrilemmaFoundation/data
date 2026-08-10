import { Suspense } from "react";
import { getAllDatasets } from "@/lib/datasets";
import { buildGraph } from "@/lib/graph";
import { GraphExplorer } from "@/components/GraphExplorer";

export const metadata = {
  title: "Knowledge Graph",
  description:
    "Explore relationships between datasets, domains, data types, tasks, and providers.",
};

export default function GraphPage() {
  const datasets = getAllDatasets();
  const fullGraph = buildGraph(datasets);

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-muted-foreground">
          Loading graph…
        </div>
      }
    >
      <GraphExplorer datasets={datasets} fullGraph={fullGraph} />
    </Suspense>
  );
}
