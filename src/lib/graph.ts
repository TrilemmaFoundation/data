import type { Dataset } from "./schema";

export type GraphNodeType =
  | "dataset"
  | "domain"
  | "dataType"
  | "task"
  | "provider"
  | "geography"
  | "format"
  | "license";

export type GraphEdgeKind =
  | "IN_DOMAIN"
  | "HAS_TYPE"
  | "SUITABLE_FOR"
  | "PROVIDED_BY"
  | "COVERS"
  | "AVAILABLE_AS"
  | "LICENSED_UNDER";

export type GraphNode = {
  id: string;
  label: string;
  type: GraphNodeType;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  kind: GraphEdgeKind;
};

export type KnowledgeGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export function graphNodeHref(node: GraphNode): string {
  if (node.type === "dataset") {
    return `/graph?dataset=${encodeURIComponent(node.id.replace(/^dataset:/, ""))}`;
  }
  return `/graph?focus=${encodeURIComponent(node.id)}`;
}

export function resolveGraphFocus(
  datasetId: string | null,
  focus: string | null,
  datasetIds: string[],
  graph: KnowledgeGraph,
): string | null {
  if (datasetId && datasetIds.includes(datasetId)) return `dataset:${datasetId}`;
  if (!focus) return null;
  const parsed = parseConceptFocus(focus);
  const id = parsed ? `${parsed.type}:${parsed.value}` : null;
  return id && graph.nodes.some((node) => node.id === id) ? id : null;
}

function conceptId(type: GraphNodeType, value: string): string {
  return `${type}:${value}`;
}

function addNode(
  map: Map<string, GraphNode>,
  id: string,
  label: string,
  type: GraphNodeType,
) {
  if (!map.has(id)) {
    map.set(id, { id, label, type });
  }
}

function addEdge(
  edges: GraphEdge[],
  source: string,
  target: string,
  kind: GraphEdgeKind,
) {
  edges.push({
    id: `${source}->${kind}->${target}`,
    source,
    target,
    kind,
  });
}

export function buildGraph(datasets: Dataset[]): KnowledgeGraph {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  for (const dataset of datasets) {
    const datasetNodeId = conceptId("dataset", dataset.id);
    addNode(nodes, datasetNodeId, dataset.name, "dataset");

    for (const domain of dataset.domains) {
      const id = conceptId("domain", domain);
      addNode(nodes, id, domain, "domain");
      addEdge(edges, datasetNodeId, id, "IN_DOMAIN");
    }

    for (const dataType of dataset.data_types) {
      const id = conceptId("dataType", dataType);
      addNode(nodes, id, dataType, "dataType");
      addEdge(edges, datasetNodeId, id, "HAS_TYPE");
    }

    for (const task of dataset.tasks) {
      const id = conceptId("task", task);
      addNode(nodes, id, task, "task");
      addEdge(edges, datasetNodeId, id, "SUITABLE_FOR");
    }

    {
      const id = conceptId("provider", dataset.provider);
      addNode(nodes, id, dataset.provider, "provider");
      addEdge(edges, datasetNodeId, id, "PROVIDED_BY");
    }

    for (const geography of dataset.geography) {
      const id = conceptId("geography", geography);
      addNode(nodes, id, geography, "geography");
      addEdge(edges, datasetNodeId, id, "COVERS");
    }

    for (const format of dataset.formats) {
      const id = conceptId("format", format);
      addNode(nodes, id, format, "format");
      addEdge(edges, datasetNodeId, id, "AVAILABLE_AS");
    }

    {
      const id = conceptId("license", dataset.license);
      addNode(nodes, id, dataset.license, "license");
      addEdge(edges, datasetNodeId, id, "LICENSED_UNDER");
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges,
  };
}

export function getSubgraph(
  graph: KnowledgeGraph,
  focusId: string,
  hops = 1,
): KnowledgeGraph {
  if (!graph.nodes.some((node) => node.id === focusId)) {
    return { nodes: [], edges: [] };
  }

  const keep = new Set<string>([focusId]);
  let frontier = new Set<string>([focusId]);

  for (let hop = 0; hop < hops; hop++) {
    const next = new Set<string>();
    for (const edge of graph.edges) {
      if (frontier.has(edge.source) && !keep.has(edge.target)) {
        next.add(edge.target);
      }
      if (frontier.has(edge.target) && !keep.has(edge.source)) {
        next.add(edge.source);
      }
    }
    for (const id of next) keep.add(id);
    frontier = next;
  }

  return {
    nodes: graph.nodes.filter((node) => keep.has(node.id)),
    edges: graph.edges.filter(
      (edge) => keep.has(edge.source) && keep.has(edge.target),
    ),
  };
}

export function getDatasetsForConcept(
  datasets: Dataset[],
  type: Exclude<GraphNodeType, "dataset">,
  value: string,
): Dataset[] {
  return datasets.filter((dataset) => {
    switch (type) {
      case "domain":
        return dataset.domains.includes(value);
      case "dataType":
        return dataset.data_types.includes(value);
      case "task":
        return dataset.tasks.includes(value);
      case "provider":
        return dataset.provider === value;
      case "geography":
        return dataset.geography.includes(value);
      case "format":
        return dataset.formats.includes(value);
      case "license":
        return dataset.license === value;
      default:
        return false;
    }
  });
}

export function parseConceptFocus(
  focus: string,
): { type: GraphNodeType; value: string } | null {
  const separator = focus.indexOf(":");
  if (separator <= 0) return null;
  const type = focus.slice(0, separator) as GraphNodeType;
  const value = focus.slice(separator + 1);
  const validTypes: GraphNodeType[] = [
    "dataset",
    "domain",
    "dataType",
    "task",
    "provider",
    "geography",
    "format",
    "license",
  ];
  if (!validTypes.includes(type) || !value) return null;
  return { type, value };
}
