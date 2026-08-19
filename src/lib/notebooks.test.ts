import { describe, expect, it } from "vitest";
import { getDatasetById } from "./datasets";
import {
  colabNotebookUrl,
  generatedNotebooks,
  githubNotebookUrl,
  hasGeneratedNotebook,
  notebookDrift,
  notebookFromDataset,
  notebookPublicPath,
  serializeNotebook,
} from "./notebooks";

describe("notebooks", () => {
  const nws = getDatasetById("nws-weather-api")!;
  const edgar = getDatasetById("sec-edgar-apis")!;

  it("generates notebooks only for active beginner no-key guides", () => {
    expect(hasGeneratedNotebook(nws)).toBe(true);
    expect(hasGeneratedNotebook(edgar)).toBe(false);
    expect(notebookPublicPath(nws.id)).toBe("/notebooks/nws-weather-api.ipynb");
    expect(colabNotebookUrl(nws.id)).toContain("colab.research.google.com");
    expect(githubNotebookUrl(nws.id)).toContain("public/notebooks/nws-weather-api.ipynb");
  });

  it("serializes a deterministic notebook from dataset YAML", () => {
    const notebook = notebookFromDataset(nws);
    const serialized = serializeNotebook(notebook);
    expect(serialized.endsWith("\n")).toBe(true);
    expect(serialized).toContain(nws.getting_started.python.code.split("\n")[0]!);
    expect(JSON.parse(serialized).cells.length).toBeGreaterThan(5);
    const generated = generatedNotebooks([nws, edgar]);
    expect(generated).toHaveLength(1);
    expect(generated[0]?.id).toBe("nws-weather-api");
    expect(
      notebookDrift(generated, { [generated[0]!.filename]: generated[0]!.contents }),
    ).toEqual([]);
    expect(notebookDrift(generated, {})).toEqual([
      "missing generated notebook nws-weather-api.ipynb",
    ]);
    expect(notebookDrift(generated, { [generated[0]!.filename]: "stale\n" })).toEqual([
      "generated notebook nws-weather-api.ipynb is out of date",
    ]);
    expect(notebookDrift([], { "extra.ipynb": "{}\n" })).toEqual([
      "unexpected notebook extra.ipynb",
    ]);
  });
});
