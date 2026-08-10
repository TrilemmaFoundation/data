"use client";

import dynamic from "next/dynamic";
import type { ForceGraphMethods } from "react-force-graph-2d";
import { Maximize2, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { GraphEdge, GraphNode, GraphNodeType, KnowledgeGraph } from "@/lib/graph";
import { Button } from "@/components/ui/button";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-96 place-items-center bg-[#0d0f1a] text-sm text-muted-foreground">
      Preparing visual map…
    </div>
  ),
});

export const NODE_COLORS: Record<GraphNodeType, string> = {
  dataset: "#ff9940",
  domain: "#9b7bf4",
  dataType: "#ef75aa",
  task: "#55c59f",
  provider: "#f1c75b",
  geography: "#6ca8e4",
  format: "#aeb4c7",
  license: "#c995f1",
};

type GraphVizNode = GraphNode & { color: string; x?: number; y?: number };
type GraphVizLink = { source: string; target: string; kind: GraphEdge["kind"] };

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
  focusId,
  height = 560,
  onNodeSelect,
}: {
  graph: KnowledgeGraph;
  focusId: string | null;
  height?: number;
  onNodeSelect: (nodeId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const [dimensions, setDimensions] = useState({ width: 800, height: 420 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0 && entry.contentRect.height > 0) {
        setDimensions({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const highlightIds = useMemo(
    () => (focusId ? neighborIds(graph, focusId) : new Set<string>()),
    [focusId, graph],
  );
  const vizData = useMemo(
    () => ({
      nodes: graph.nodes.map((node): GraphVizNode => ({ ...node, color: NODE_COLORS[node.type] })),
      links: graph.edges.map((edge): GraphVizLink => ({
        source: edge.source,
        target: edge.target,
        kind: edge.kind,
      })),
    }),
    [graph],
  );

  function fitGraph() {
    graphRef.current?.zoomToFit(350, 48);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f1a]">
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <Button type="button" size="icon" variant="outline" onClick={fitGraph} aria-label="Fit graph to view">
          <Maximize2 aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => {
            setHoveredId(null);
            graphRef.current?.centerAt(0, 0, 350);
            graphRef.current?.zoom(1, 350);
          }}
          aria-label="Reset visual map"
        >
          <RotateCcw aria-hidden="true" />
        </Button>
      </div>
      <div
        ref={containerRef}
        className="h-[360px] lg:h-[var(--graph-height)]"
        style={{ "--graph-height": `${height}px` } as CSSProperties}
        aria-hidden="true"
      >
        <ForceGraph2D
          ref={graphRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={vizData}
          backgroundColor="#0d0f1a"
          nodeId="id"
          nodeLabel={(node) => {
            const item = node as GraphVizNode;
            return `${item.type}: ${item.label}`;
          }}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const item = node as GraphVizNode;
            const dimmed = highlightIds.size > 0 && !highlightIds.has(item.id);
            const radius = item.type === "dataset" ? 7 : 5;

            ctx.beginPath();
            ctx.arc(item.x ?? 0, item.y ?? 0, radius, 0, 2 * Math.PI);
            ctx.fillStyle = dimmed ? `${item.color}38` : item.color;
            ctx.fill();

            if (item.id === focusId) {
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 2.5 / globalScale;
              ctx.stroke();
            }

            const showLabel = dimensions.width < 500
              ? item.id === hoveredId || item.id === focusId
              : item.type === "dataset" || item.id === hoveredId || (focusId !== null && highlightIds.has(item.id));
            if (!showLabel) return;

            const maxLabelLength = dimensions.width < 500 ? 20 : 30;
            const displayLabel = item.label.length > maxLabelLength
              ? `${item.label.slice(0, maxLabelLength - 1).trimEnd()}…`
              : item.label;
            const fontSize = 11 / globalScale;
            ctx.font = `600 ${fontSize}px Roboto, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            const labelY = (item.y ?? 0) + radius + 3 / globalScale;
            const labelWidth = ctx.measureText(displayLabel).width;
            ctx.fillStyle = "rgba(10, 10, 20, 0.82)";
            ctx.fillRect(
              (item.x ?? 0) - labelWidth / 2 - 3 / globalScale,
              labelY - 1 / globalScale,
              labelWidth + 6 / globalScale,
              fontSize + 4 / globalScale,
            );
            ctx.fillStyle = dimmed ? "#70758a" : "#ffffff";
            ctx.fillText(displayLabel, item.x ?? 0, labelY);
          }}
          linkColor={() => "#4d536b"}
          linkWidth={(link) => {
            const source = typeof link.source === "object" ? (link.source as GraphVizNode).id : String(link.source);
            const target = typeof link.target === "object" ? (link.target as GraphVizNode).id : String(link.target);
            return highlightIds.size === 0 || (highlightIds.has(source) && highlightIds.has(target)) ? 1.5 : 0.35;
          }}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          onNodeHover={(node) => setHoveredId(node ? String((node as GraphVizNode).id) : null)}
          onNodeClick={(node) => onNodeSelect(String((node as GraphVizNode).id))}
          showPointerCursor
          onEngineStop={fitGraph}
          cooldownTicks={80}
        />
      </div>
    </div>
  );
}
