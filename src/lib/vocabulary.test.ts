import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearVocabularyCacheForTests,
  getVocabulary,
  loadVocabulary,
  parseVocabulary,
  validateVocabularyCoverage,
  toVocabularySnapshot,
} from "./vocabulary";

const tempFiles: string[] = [];

afterEach(() => {
  clearVocabularyCacheForTests();
  for (const file of tempFiles.splice(0)) {
    fs.rmSync(file, { force: true });
  }
  vi.unstubAllEnvs();
});

function writeTemp(contents: string): string {
  const file = path.join(os.tmpdir(), `vocab-${Math.random().toString(16).slice(2)}.yaml`);
  fs.writeFileSync(file, contents);
  tempFiles.push(file);
  return file;
}

const valid = {
  domains: [
    {
      label: "Natural Hazards",
      filterable: true,
      aliases: ["Seismology"],
    },
  ],
  tasks: [
    {
      label: "Monitoring",
      filterable: true,
      aliases: ["Hazard Monitoring"],
    },
    {
      label: "Archive Only",
      filterable: false,
      aliases: [],
    },
  ],
};

describe("vocabulary", () => {
  it("resolves aliases, filterable labels, and keywords", () => {
    const { vocabulary, errors } = parseVocabulary(valid);
    expect(errors).toEqual([]);
    expect(vocabulary?.resolve("domains", "seismology")).toBe("Natural Hazards");
    expect(vocabulary?.canonicalize("domains", "Unknown")).toBe("Unknown");
    expect(vocabulary?.filterableLabels("tasks")).toEqual(["Monitoring"]);
    const snapshot = toVocabularySnapshot(vocabulary!);
    expect(snapshot.aliases.domains.seismology).toBe("Natural Hazards");
    expect(snapshot.filterable.tasks).toEqual(["Monitoring"]);
    expect(vocabulary?.allLabels("tasks")).toEqual(["Monitoring", "Archive Only"]);
    expect(vocabulary?.keywordsFor("domains", ["Seismology"])).toEqual([
      "Natural Hazards",
      "Seismology",
    ]);
    expect(
      validateVocabularyCoverage(
        { domains: ["Seismology"], tasks: ["Invented"] },
        vocabulary!,
      ),
    ).toEqual(['tasks[0] "Invented" is not in the catalog vocabulary']);
    expect(
      validateVocabularyCoverage(
        { domains: ["Invented"], tasks: ["Monitoring"] },
        vocabulary!,
      ),
    ).toEqual(['domains[0] "Invented" is not in the catalog vocabulary']);
    expect(parseVocabulary(null).errors[0]).toContain("(root)");
    expect(vocabulary?.keywordsFor("domains", ["Unknown"])).toEqual(["Unknown"]);
  });

  it("rejects collisions, schema errors, and alias loops", () => {
    expect(parseVocabulary({ domains: [], tasks: [] }).errors.length).toBeGreaterThan(0);
    expect(
      parseVocabulary({
        domains: [
          { label: "Natural Hazards", filterable: true, aliases: ["Seismology"] },
          { label: "Natural Hazards", filterable: true, aliases: [] },
        ],
        tasks: valid.tasks,
      }).errors.some((error) => error.includes("duplicates")),
    ).toBe(true);
    expect(
      parseVocabulary({
        domains: [
          { label: "Natural Hazards", filterable: true, aliases: ["Natural Hazards"] },
        ],
        tasks: valid.tasks,
      }).errors.some((error) => error.includes("repeats the canonical label")),
    ).toBe(true);
    expect(
      parseVocabulary({
        domains: [
          { label: "Climate", filterable: true, aliases: ["Seismology"] },
          { label: "Natural Hazards", filterable: true, aliases: ["Seismology"] },
        ],
        tasks: valid.tasks,
      }).errors.some((error) => error.includes("collides")),
    ).toBe(true);
  });

  it("loads the repository vocabulary and caches outside development", () => {
    const first = getVocabulary();
    expect(first.resolve("domains", "Wildfires")).toBe("Natural Hazards");
    expect(first.resolve("domains", "jobs")).toBe("Labor Economics");
    const second = loadVocabulary();
    expect(second.vocabulary).toBe(first);
  });

  it("reports missing, malformed, and invalid files", () => {
    expect(loadVocabulary(path.join(os.tmpdir(), "missing-vocab.yaml")).errors[0]).toContain(
      "does not exist",
    );
    const malformed = writeTemp("[");
    expect(loadVocabulary(malformed).errors[0]).toContain("YAML parse error");
    const boom = writeTemp("domains: []\n");
    const spy = vi.spyOn(fs, "readFileSync").mockImplementationOnce(() => {
      throw "disk unavailable";
    });
    expect(loadVocabulary(boom).errors[0]).toContain("disk unavailable");
    spy.mockRestore();
    const invalid = writeTemp("domains: []\ntasks: []\n");
    expect(loadVocabulary(invalid).vocabulary).toBeNull();
    expect(() => getVocabulary(invalid)).toThrow(/Invalid vocabulary/);
  });

  it("does not cache in development and throws on invalid default files", () => {
    vi.stubEnv("NODE_ENV", "development");
    const first = loadVocabulary();
    const second = loadVocabulary();
    expect(first.vocabulary).not.toBe(second.vocabulary);
    expect(second.errors).toEqual([]);
  });
});
