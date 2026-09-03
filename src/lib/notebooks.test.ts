import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getDatasetById } from "./datasets";
import {
  colabNotebookUrl,
  generatedNotebooks,
  hasGeneratedNotebook,
  notebookDrift,
  notebookFromDataset,
  NOTEBOOKS_PUBLIC_DIR,
  serializeNotebook,
} from "./notebooks";

describe("notebooks", () => {
  const nws = getDatasetById("nws-weather-api")!;
  const edgar = getDatasetById("sec-edgar-apis")!;

  it("generates notebooks only for active beginner no-key guides", () => {
    expect(hasGeneratedNotebook(nws)).toBe(true);
    expect(hasGeneratedNotebook(edgar)).toBe(false);
    expect(colabNotebookUrl(nws.id)).toContain("colab.research.google.com");
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

  it("commits generated notebooks for City of Vancouver beginner guides", () => {
    const ids = [
      "vancouver-311-service-requests",
      "vancouver-business-licences",
      "vancouver-council-voting-records",
      "vancouver-issued-building-permits",
      "vancouver-parking-tickets",
      "vancouver-property-addresses",
      "vancouver-property-tax-report",
      "vancouver-public-trees",
      "vancouver-road-closures",
      "vancouver-zoning-districts",
    ];
    const vancouver = ids.map((id) => {
      const dataset = getDatasetById(id);
      expect(dataset, id).toBeDefined();
      return dataset!;
    });
    expect(vancouver.every(hasGeneratedNotebook)).toBe(true);

    const generated = generatedNotebooks(vancouver);
    expect(generated.map((file) => file.filename)).toEqual([
      "vancouver-311-service-requests.ipynb",
      "vancouver-business-licences.ipynb",
      "vancouver-council-voting-records.ipynb",
      "vancouver-issued-building-permits.ipynb",
      "vancouver-parking-tickets.ipynb",
      "vancouver-property-addresses.ipynb",
      "vancouver-property-tax-report.ipynb",
      "vancouver-public-trees.ipynb",
      "vancouver-road-closures.ipynb",
      "vancouver-zoning-districts.ipynb",
    ]);

    const onDisk = Object.fromEntries(
      generated.map((file) => {
        const diskPath = path.join(NOTEBOOKS_PUBLIC_DIR, file.filename);
        expect(fs.existsSync(diskPath), file.filename).toBe(true);
        return [file.filename, fs.readFileSync(diskPath, "utf8")];
      }),
    );
    expect(notebookDrift(generated, onDisk)).toEqual([]);

    const serviceRequests = generated.find(
      (file) => file.id === "vancouver-311-service-requests",
    )!;
    expect(serviceRequests.contents).toContain("vancouver-311-service-requests");
    expect(serviceRequests.contents).toContain("3-1-1-service-requests");
    expect(serviceRequests.contents).not.toContain("/311-service-requests/");
  });
});
