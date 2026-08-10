"use client";

import Link from "next/link";
import { ArrowLeft, ChevronDown, Network } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Dataset } from "@/lib/schema";
import {
  GRAPH_NODE_TYPES,
  getConnectedNodes,
  getRelatedDatasets,
  graphNodeHref,
  getSubgraph,
  groupGraphNodes,
  resolveGraphFocus,
  type GraphNodeType,
  type KnowledgeGraph,
} from "@/lib/graph";
import { DatasetGraph, NODE_COLORS } from "@/components/DatasetGraph";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<GraphNodeType, string> = {
  dataset: "Datasets",
  domain: "Domains",
  dataType: "Data types",
  task: "Tasks",
  provider: "Providers",
  geography: "Geographies",
  format: "Formats",
  license: "Licenses",
};

export function GraphExplorer({
  datasets,
  fullGraph,
}: {
  datasets: Dataset[];
  fullGraph: KnowledgeGraph;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const datasetId = searchParams.get("dataset");
  const focusParam = searchParams.get("focus");
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [hasOpenedMap, setHasOpenedMap] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (detailsRef.current) detailsRef.current.open = isDesktop;
  }, [isDesktop]);

  const focusId = useMemo(() => {
    return resolveGraphFocus(
      datasetId,
      focusParam,
      datasets.map((dataset) => dataset.id),
      fullGraph,
    );
  }, [datasetId, datasets, focusParam, fullGraph]);

  const graph = useMemo(
    () => (focusId ? getSubgraph(fullGraph, focusId, 1) : fullGraph),
    [focusId, fullGraph],
  );
  const selectedNode = fullGraph.nodes.find((node) => node.id === focusId) ?? null;
  const connectedNodes = useMemo(
    () => getConnectedNodes(fullGraph, graph, focusId),
    [focusId, fullGraph, graph],
  );
  const relatedDatasets = useMemo(
    () => getRelatedDatasets(datasets, fullGraph, focusId),
    [datasets, focusId, fullGraph],
  );

  const groupedOptions = useMemo(
    () =>
      groupGraphNodes(fullGraph),
    [fullGraph],
  );

  function selectNode(id: string) {
    const node = fullGraph.nodes.find((item) => item.id === id);
    if (node) router.replace(graphNodeHref(node), { scroll: false });
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="max-w-3xl">
        <p className="eyebrow">Optional explorer</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Explore dataset connections
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
          Choose a dataset or concept to see how domains, tasks, formats, providers, and licenses connect. The list works without the visual map.
        </p>
      </header>

      <section className="surface mt-9 p-5 sm:p-7" aria-labelledby="focus-title">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_1.2fr]">
          <div>
            <label id="focus-title" htmlFor="graph-focus" className="text-sm font-semibold text-white">
              Focus on a dataset or concept
            </label>
            <div className="relative mt-2">
              <select
                id="graph-focus"
                value={focusId ?? ""}
                onChange={(event) => {
                  if (event.target.value) selectNode(event.target.value);
                  else router.replace("/graph", { scroll: false });
                }}
                className="h-12 w-full appearance-none rounded-xl border border-white/15 bg-[#0a0a14] px-4 pr-11 text-sm text-white"
              >
                <option value="">All connections</option>
                {groupedOptions.map(({ type, nodes }) => (
                  <optgroup key={type} label={TYPE_LABELS[type]}>
                    {nodes.map((node) => (
                      <option key={node.id} value={node.id}>{node.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{graph.nodes.length} nodes</Badge>
              <Badge variant="outline">{graph.edges.length} links</Badge>
              {focusId && (
                <Link href="/graph" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                  <ArrowLeft aria-hidden="true" /> Show all
                </Link>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">
              {selectedNode ? `Connected to ${selectedNode.label}` : "Dataset guides"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedNode
                ? "Choose any relationship to refocus the explorer."
                : "Start with a dataset guide or choose a concept above."}
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {connectedNodes.map((node) => (
                <li key={node.id}>
                  {node.type === "dataset" && !selectedNode ? (
                    <Link
                      href={`/datasets/${node.id.replace(/^dataset:/, "")}`}
                      className="inline-flex min-h-11 items-center rounded-lg border border-white/10 bg-white/[0.025] px-3 text-sm text-white/80 hover:border-primary/50 hover:text-white"
                    >
                      {node.label}
                    </Link>
                  ) : (
                    <Link
                      href={graphNodeHref(node)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-3 text-sm text-white/80 hover:border-primary/50 hover:text-white"
                    >
                      <span className="size-2 rounded-full" style={{ backgroundColor: NODE_COLORS[node.type] }} aria-hidden="true" />
                      {node.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>

            {selectedNode && (
              <div className="mt-6 border-t border-white/10 pt-5">
                <h3 className="text-sm font-semibold text-white">Related dataset guides</h3>
                {relatedDatasets.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {relatedDatasets.map((dataset) => (
                      <li key={dataset.id}>
                        <Link
                          href={`/datasets/${dataset.id}`}
                          className="inline-flex min-h-11 items-center rounded-lg border border-primary/30 bg-primary/10 px-3 text-sm font-medium text-white hover:border-primary/60"
                        >
                          {dataset.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No other catalog datasets share this selection yet.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <details
        ref={detailsRef}
        className="group mt-6"
        onToggle={(event) => {
          if (event.currentTarget.open) setHasOpenedMap(true);
        }}
      >
        <summary className="surface flex min-h-14 cursor-pointer list-none items-center justify-between px-5 font-semibold text-white marker:content-none lg:hidden">
          <span className="flex items-center gap-2"><Network className="size-5 text-primary" aria-hidden="true" /> Show visual map</span>
          <ChevronDown className="size-5 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="mt-3 hidden group-open:block lg:mt-0 lg:block">
          {isDesktop || hasOpenedMap ? (
            <DatasetGraph
              key={focusId ?? "all"}
              graph={graph}
              focusId={focusId}
              height={640}
              onNodeSelect={selectNode}
            />
          ) : (
            <div className="grid h-[420px] place-items-center rounded-2xl border border-white/10 bg-[#0d0f1a] text-sm text-muted-foreground lg:h-[640px]">
              Preparing visual map…
            </div>
          )}
        </div>
      </details>

      <section className="mt-6" aria-labelledby="legend-title">
        <h2 id="legend-title" className="sr-only">Connection types</h2>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          {GRAPH_NODE_TYPES.map((type) => (
            <li key={type} className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: NODE_COLORS[type] }} aria-hidden="true" />
              {TYPE_LABELS[type]}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
