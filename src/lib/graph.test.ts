import { describe, expect, it } from "vitest";
import { buildGraph, getDatasetsForConcept, getSubgraph } from "./graph";
import type { Dataset } from "./schema";

const iris: Dataset = {
  id: "iris",
  name: "Iris",
  description: "Classic flower measurement dataset.",
  url: "https://archive.ics.uci.edu/dataset/53/iris",
  access_type: ["download"],
  api_key_required: false,
  free_to_access: true,
  size_gb_min: 0,
  size_gb_max: 0.001,
  formats: ["CSV"],
  license: "CC BY 4.0",
  license_url: "https://creativecommons.org/licenses/by/4.0/",
  domains: ["Biology"],
  data_types: ["Tabular"],
  tasks: ["Classification", "Clustering"],
  difficulty: "beginner",
  geography: ["Not applicable"],
  temporal_coverage: null,
  update_frequency: "static",
  provider: "UCI Machine Learning Repository",
  source_type: "academic",
  last_verified: "2026-08-10",
};

const wine: Dataset = {
  ...iris,
  id: "wine-quality",
  name: "Wine Quality",
  domains: ["Chemistry"],
  tasks: ["Regression", "Classification"],
  geography: ["Portugal"],
};

describe("buildGraph", () => {
  it("dedupes shared concept nodes", () => {
    const graph = buildGraph([iris, wine]);
    const classification = graph.nodes.filter(
      (node) => node.id === "task:Classification",
    );
    const providers = graph.nodes.filter(
      (node) => node.id === "provider:UCI Machine Learning Repository",
    );

    expect(classification).toHaveLength(1);
    expect(providers).toHaveLength(1);
    expect(graph.edges.some((edge) => edge.kind === "SUITABLE_FOR")).toBe(true);
  });

  it("builds a one-hop subgraph", () => {
    const graph = buildGraph([iris, wine]);
    const sub = getSubgraph(graph, "dataset:iris", 1);
    expect(sub.nodes.some((node) => node.id === "domain:Biology")).toBe(true);
    expect(sub.nodes.some((node) => node.id === "dataset:wine-quality")).toBe(
      false,
    );
  });

  it("finds datasets for a concept", () => {
    const matches = getDatasetsForConcept([iris, wine], "task", "Classification");
    expect(matches.map((d) => d.id).sort()).toEqual(["iris", "wine-quality"]);
  });
});
