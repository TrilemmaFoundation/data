"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Dataset } from "@/lib/schema";
import type { GraphEdge, GraphNode, KnowledgeGraph } from "@/lib/graph";
import { getDatasetsForConcept, type GraphNodeType } from "@/lib/graph";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[420px] items-center justify-center rounded-xl border bg-muted/30 text-sm text-muted-foreground">
      Loading graph…
    </div>
  ),
});

const NODE_COLORS: Record<GraphNodeType, string> = {
  dataset: "#2563eb",
  domain: "#7c3aed",
  dataType: "#db2777",
  task: "#059669",
  provider: "#d97706",
  geography: "#0891b2",
  format: "#4b5563",
  license: "#9333ea",
};

type GraphVizNode = GraphNode & {
  color: string;
  x?: number;
  y?: number;
};

type GraphVizLink = {
  source: string;
  target: string;
  kind: GraphEdge["kind"];
};

type DatasetGraphProps = {
  graph: KnowledgeGraph;
  datasets: Dataset[];
  focusId?: string | null;
  className?: string;
  height?: number;
};

function legendLabel(type: GraphNodeType): string {
  switch (type) {
    case "dataType":
      return "Data Type";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

function neighborIds(graph: KnowledgeGraph, nodeId: string): Set<string> {
  const related = new Set<string>([nodeId]);
  for (const edge of graph.edges) {
    if (edge.source === nodeId) related.add(edge.target);
    if (edge.target === nodeId) related.add(edge.source);
  }
  return related;
}

export function DatasetGraph({
  graph,
  datasets,
  focusId = null,
  className,
  height = 560,
}: DatasetGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [clickedNodeId, setClickedNodeId] = useState<string | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(element);
    setWidth(Math.floor(element.clientWidth));
    return () => observer.disconnect();
  }, []);

  const selectedNodeId = clickedNodeId ?? focusId;

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return graph.nodes.find((item) => item.id === selectedNodeId) ?? null;
  }, [graph.nodes, selectedNodeId]);

  const highlightIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    return neighborIds(graph, selectedNode.id);
  }, [graph, selectedNode]);

  const vizData = useMemo(() => {
    const nodes: GraphVizNode[] = graph.nodes.map((node) => ({
      ...node,
      color: NODE_COLORS[node.type],
    }));
    const links: GraphVizLink[] = graph.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      kind: edge.kind,
    }));
    return { nodes, links };
  }, [graph]);

  const relatedDatasets = useMemo(() => {
    if (!selectedNode) return [];
    if (selectedNode.type === "dataset") {
      return datasets.filter(
        (dataset) => `dataset:${dataset.id}` === selectedNode.id,
      );
    }
    return getDatasetsForConcept(
      datasets,
      selectedNode.type,
      selectedNode.label,
    );
  }, [datasets, selectedNode]);

  const handleNodeClick = useCallback((node: GraphVizNode) => {
    setClickedNodeId(node.id);
  }, []);

  return (
    <div className={cn("grid gap-4 lg:grid-cols-[1fr_280px]", className)}>
      <div
        ref={containerRef}
        className="overflow-hidden rounded-xl border bg-card"
        style={{ height }}
      >
        <ForceGraph2D
          width={width}
          height={height}
          graphData={vizData}
          nodeId="id"
          nodeLabel={(node) => {
            const n = node as GraphVizNode;
            return `${legendLabel(n.type)}: ${n.label}`;
          }}
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
          linkWidth={(link) => {
            const source =
              typeof link.source === "object"
                ? (link.source as GraphVizNode).id
                : String(link.source);
            const target =
              typeof link.target === "object"
                ? (link.target as GraphVizNode).id
                : String(link.target);
            if (highlightIds.size === 0) return 1;
            return highlightIds.has(source) && highlightIds.has(target)
              ? 2.5
              : 0.4;
          }}
          linkColor={() => "#94a3b8"}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const n = node as GraphVizNode;
            const label = n.label;
            const fontSize = 12 / globalScale;
            const radius = n.type === "dataset" ? 7 : 5;
            const dimmed =
              highlightIds.size > 0 && !highlightIds.has(n.id);

            ctx.beginPath();
            ctx.arc(n.x ?? 0, n.y ?? 0, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = dimmed ? `${n.color}55` : n.color;
            ctx.fill();

            if (selectedNode?.id === n.id) {
              ctx.strokeStyle = "#0f172a";
              ctx.lineWidth = 2 / globalScale;
              ctx.stroke();
            }

            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillStyle = dimmed ? "#94a3b8" : "#0f172a";
            ctx.fillText(label, n.x ?? 0, (n.y ?? 0) + radius + 2);
          }}
          onNodeClick={(node) => handleNodeClick(node as GraphVizNode)}
          cooldownTicks={80}
        />
      </div>

      <div className="space-y-4 rounded-xl border bg-card p-4">
        <div>
          <h3 className="font-heading text-sm font-semibold">Legend</h3>
          <ul className="mt-2 space-y-1.5">
            {(Object.keys(NODE_COLORS) as GraphNodeType[]).map((type) => (
              <li key={type} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: NODE_COLORS[type] }}
                />
                {legendLabel(type)}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-heading text-sm font-semibold">Selection</h3>
          {selectedNode ? (
            <div className="mt-2 space-y-3">
              <div>
                <Badge variant="secondary">{legendLabel(selectedNode.type)}</Badge>
                <p className="mt-1 font-medium">{selectedNode.label}</p>
              </div>

              {selectedNode.type === "dataset" ? (
                <Link
                  href={`/datasets/${selectedNode.id.replace(/^dataset:/, "")}`}
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  Open dataset page
                </Link>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Related datasets
                  </p>
                  {relatedDatasets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None</p>
                  ) : (
                    <ul className="space-y-1">
                      {relatedDatasets.map((dataset) => (
                        <li key={dataset.id}>
                          <Link
                            href={`/datasets/${dataset.id}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {dataset.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Click a node to explore connections.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
