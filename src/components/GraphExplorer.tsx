"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { Dataset } from "@/lib/schema";
import {
  getSubgraph,
  parseConceptFocus,
  type KnowledgeGraph,
} from "@/lib/graph";
import { DatasetGraph } from "@/components/DatasetGraph";
import { Badge } from "@/components/ui/badge";

type GraphExplorerProps = {
  datasets: Dataset[];
  fullGraph: KnowledgeGraph;
};

export function GraphExplorer({ datasets, fullGraph }: GraphExplorerProps) {
  const searchParams = useSearchParams();
  const datasetId = searchParams.get("dataset");
  const focusParam = searchParams.get("focus");

  const { graph, focusId, title, description } = useMemo(() => {
    if (datasetId) {
      const focus = `dataset:${datasetId}`;
      const dataset = datasets.find((item) => item.id === datasetId);
      return {
        graph: getSubgraph(fullGraph, focus, 1),
        focusId: focus,
        title: dataset
          ? `Graph around ${dataset.name}`
          : "Focused knowledge graph",
        description: dataset
          ? `One-hop neighborhood for ${dataset.name}.`
          : "Dataset focus from the URL was not found; showing empty subgraph.",
      };
    }

    if (focusParam) {
      const parsed = parseConceptFocus(focusParam);
      if (parsed) {
        const focus = `${parsed.type}:${parsed.value}`;
        return {
          graph: getSubgraph(fullGraph, focus, 1),
          focusId: focus,
          title: `Graph around ${parsed.value}`,
          description: `Datasets and concepts connected to this ${parsed.type}.`,
        };
      }
    }

    return {
      graph: fullGraph,
      focusId: null,
      title: "Full knowledge graph",
      description:
        "Explore how datasets connect through domains, data types, tasks, providers, and more.",
    };
  }, [datasetId, datasets, focusParam, fullGraph]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-10 sm:px-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {title}
          </h1>
          <Badge variant="secondary">
            {graph.nodes.length} nodes · {graph.edges.length} edges
          </Badge>
        </div>
        <p className="max-w-3xl text-muted-foreground">{description}</p>
      </div>

      <DatasetGraph
        key={focusId ?? "full"}
        graph={graph}
        datasets={datasets}
        focusId={focusId}
        height={640}
      />
    </div>
  );
}
