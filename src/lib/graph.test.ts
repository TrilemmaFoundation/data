import { describe, expect, it } from "vitest";
import {
  buildGraph,
  getConnectedNodes,
  getDatasetsForConcept,
  getRelatedDatasets,
  getSubgraph,
  groupGraphNodes,
  graphNodeHref,
  resolveGraphFocus,
} from "./graph";
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
  getting_started: {
    overview: "A friendly place to begin.",
    prerequisites: ["Python 3.10 or newer"],
    access_steps: ["Download the CSV."],
    python: { packages: ["pandas"], code: "print('hello')" },
    first_project: {
      title: "Explore the data",
      goal: "Understand its columns.",
      steps: ["Inspect the first rows.", "Summarize the columns.", "Record one finding."],
    },
  },
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

  it("keeps dataset and concept focus query links compatible", () => {
    const graph = buildGraph([iris, wine]);
    const datasetNode = graph.nodes.find((node) => node.id === "dataset:iris")!;
    const conceptNode = graph.nodes.find((node) => node.id === "task:Classification")!;

    expect(graphNodeHref(datasetNode)).toBe("/graph?dataset=iris");
    expect(graphNodeHref(conceptNode)).toBe("/graph?focus=task%3AClassification");
    expect(resolveGraphFocus("iris", null, ["iris", "wine-quality"], graph)).toBe(
      "dataset:iris",
    );
    expect(resolveGraphFocus(null, "task:Classification", ["iris"], graph)).toBe(
      "task:Classification",
    );
    expect(resolveGraphFocus("missing", "not-valid", ["iris"], graph)).toBeNull();
  });

  it("derives explorer connections and related datasets", () => {
    const graph = buildGraph([iris, wine]);
    const focused = getSubgraph(graph, "dataset:iris", 1);

    expect(getConnectedNodes(graph, focused, "dataset:iris")).not.toContainEqual(
      expect.objectContaining({ id: "dataset:iris" }),
    );
    expect(getConnectedNodes(graph, graph, null).map((node) => node.id)).toEqual([
      "dataset:iris",
      "dataset:wine-quality",
    ]);
    expect(getRelatedDatasets([iris, wine], graph, "dataset:iris").map((d) => d.id)).toEqual([
      "wine-quality",
    ]);
    expect(
      getRelatedDatasets([iris, wine], graph, "task:Classification").map((d) => d.id),
    ).toEqual(["iris", "wine-quality"]);
    expect(getRelatedDatasets([iris, wine], graph, "task:missing")).toEqual([]);
  });

  it("groups focus options in stable label order", () => {
    const groups = groupGraphNodes(buildGraph([wine, iris]));
    expect(groups[0]?.type).toBe("dataset");
    expect(groups[0]?.nodes.map((node) => node.label)).toEqual(["Iris", "Wine Quality"]);
  });
});
