import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAllCollections,
  getCollectionById,
  getCollectionsDir,
  listCollectionFiles,
  loadCollections,
  MAX_COLLECTION_FILE_BYTES,
  STARTER_COLLECTION_ID,
  validateCollectionMembership,
} from "./collections";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "collections-"));
  tempDirs.push(dir);
  return dir;
}

const validYaml = `
id: first-builds
title: Start with a first microproduct
summary: Beginner sources with a small first project you can finish today.
curator: Trilemma Data
last_updated: 2026-08-19
dataset_ids:
  - nws-weather-api
  - usgs-earthquakes
  - cdc-fluview-ilinet
`;

describe("collections", () => {
  it("loads the repository collections and validates membership", () => {
    const collections = getAllCollections();
    expect(collections.length).toBeGreaterThanOrEqual(5);
    expect(getCollectionById(collections[0]!.id)?.id).toBe(collections[0]!.id);
    expect(getCollectionById("missing")).toBeUndefined();
    expect(STARTER_COLLECTION_ID).toBe("first-builds");
    expect(getCollectionsDir()).toMatch(/data\/collections$/);
    expect(
      validateCollectionMembership(collections[0]!, new Set(collections[0]!.dataset_ids)),
    ).toEqual([]);
    expect(
      validateCollectionMembership(collections[0]!, new Set())[0],
    ).toContain("not an active catalog dataset");
  });

  it("reports missing, empty, malformed, and invalid collections", () => {
    const missing = path.join(makeTempDir(), "missing");
    expect(loadCollections(missing).errors[0]?.messages).toContain(
      "collections directory does not exist",
    );

    const empty = makeTempDir();
    fs.writeFileSync(path.join(empty, "_template.yaml"), validYaml);
    expect(loadCollections(empty).errors[0]?.messages).toContain(
      "no collection YAML files found",
    );

    const malformed = makeTempDir();
    fs.writeFileSync(path.join(malformed, "first-builds.yaml"), "[");
    expect(loadCollections(malformed).errors[0]?.messages[0]).toContain("YAML parse error");

    const invalid = makeTempDir();
    fs.writeFileSync(path.join(invalid, "first-builds.yaml"), "id: first-builds\n");
    expect(loadCollections(invalid).errors[0]?.messages.length).toBeGreaterThan(0);
  });

  it("enforces filename identity, duplicates, size, and file type", () => {
    const mismatch = makeTempDir();
    fs.writeFileSync(path.join(mismatch, "other.yaml"), validYaml);
    expect(
      loadCollections(mismatch).errors[0]?.messages.some((message) => message.includes("must match")),
    ).toBe(true);

    const duplicates = makeTempDir();
    fs.writeFileSync(path.join(duplicates, "first-builds.yaml"), validYaml);
    fs.writeFileSync(
      path.join(duplicates, "other.yaml"),
      validYaml.replace("title: Start with a first microproduct", "title: Other"),
    );
    expect(
      loadCollections(duplicates).errors.flatMap((error) => error.messages).some((message) =>
        message.includes("duplicate id"),
      ),
    ).toBe(true);

    const oversized = makeTempDir();
    fs.writeFileSync(
      path.join(oversized, "first-builds.yaml"),
      "x".repeat(MAX_COLLECTION_FILE_BYTES + 1),
    );
    expect(loadCollections(oversized).errors[0]?.messages).toContain(
      `collection file exceeds ${MAX_COLLECTION_FILE_BYTES} bytes`,
    );

    const linked = makeTempDir();
    fs.writeFileSync(path.join(linked, "target.yaml"), validYaml);
    fs.symlinkSync(path.join(linked, "target.yaml"), path.join(linked, "first-builds.yaml"));
    expect(loadCollections(linked).errors[0]?.messages).toContain(
      "collection entry must be a regular file",
    );
  });

  it("reports directory and file metadata failures", () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, "first-builds.yaml"), validYaml);
    const read = vi.spyOn(fs, "readdirSync").mockImplementationOnce(() => {
      throw new Error("permission denied");
    });
    expect(loadCollections(dir).errors[0]?.messages[0]).toContain("permission denied");
    read.mockRestore();

    const stat = vi.spyOn(fs, "lstatSync").mockImplementationOnce(() => {
      throw "metadata unavailable";
    });
    expect(loadCollections(dir).errors[0]?.messages[0]).toContain("metadata unavailable");
    stat.mockRestore();

    expect(listCollectionFiles(path.join(makeTempDir(), "missing"))).toEqual([]);
    expect(() => getAllCollections(makeTempDir())).toThrow(/Invalid collections/);

    const yamlThrow = makeTempDir();
    fs.writeFileSync(path.join(yamlThrow, "first-builds.yaml"), validYaml);
    const readFile = vi.spyOn(fs, "readFileSync").mockImplementationOnce(() => {
      throw "disk unavailable";
    });
    expect(loadCollections(yamlThrow).errors[0]?.messages[0]).toContain("disk unavailable");
    readFile.mockRestore();

    const root = makeTempDir();
    fs.writeFileSync(path.join(root, "first-builds.yaml"), "null\n");
    expect(loadCollections(root).errors[0]?.messages[0]).toContain("(root)");
  });

  it("loads a valid temporary collection catalog", () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, "first-builds.yaml"), validYaml);
    expect(loadCollections(dir).collections).toHaveLength(1);
    expect(getAllCollections(dir).map((collection) => collection.id)).toEqual(["first-builds"]);
  });
});
