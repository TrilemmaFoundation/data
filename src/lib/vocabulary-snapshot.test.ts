import { describe, expect, it } from "vitest";
import {
  canonicalizeSnapshotValue,
  EMPTY_VOCABULARY_SNAPSHOT,
  resolveSnapshotAlias,
  snapshotHasTerms,
  validateSnapshotCoverage,
} from "./vocabulary-snapshot";

describe("vocabulary snapshot helpers", () => {
  it("resolves aliases and falls back to the raw value", () => {
    const snapshot = {
      aliases: {
        domains: { seismology: "Natural Hazards" },
        tasks: {},
      },
      filterable: { domains: ["Natural Hazards"], tasks: [] },
    };
    expect(resolveSnapshotAlias(snapshot, "domains", "Seismology")).toBe("Natural Hazards");
    expect(resolveSnapshotAlias(EMPTY_VOCABULARY_SNAPSHOT, "domains", "Seismology")).toBeNull();
    expect(resolveSnapshotAlias(snapshot, "domains", "constructor")).toBeNull();
    expect(resolveSnapshotAlias(snapshot, "tasks", "__proto__")).toBeNull();
    expect(resolveSnapshotAlias(snapshot, "domains", "toString")).toBeNull();
    expect(snapshotHasTerms(snapshot)).toBe(true);
    expect(snapshotHasTerms(EMPTY_VOCABULARY_SNAPSHOT)).toBe(false);
    expect(resolveSnapshotAlias({
      ...snapshot,
      aliases: {
        ...snapshot.aliases,
        domains: { missing: undefined as unknown as string },
      },
    }, "domains", "missing")).toBeNull();
    expect(canonicalizeSnapshotValue(snapshot, "domains", "Unknown")).toBe("Unknown");
    expect(
      validateSnapshotCoverage(
        { domains: ["Seismology"], tasks: ["Totally Invented Task"] },
        snapshot,
      ),
    ).toEqual(['tasks[0] "Totally Invented Task" is not in the catalog vocabulary']);
    expect(
      validateSnapshotCoverage({ domains: ["Natural Hazards"], tasks: [] }, EMPTY_VOCABULARY_SNAPSHOT),
    ).toEqual([]);
    expect(
      validateSnapshotCoverage({ domains: ["constructor"], tasks: ["__proto__"] }, snapshot),
    ).toEqual([
      'domains[0] "constructor" is not in the catalog vocabulary',
      'tasks[0] "__proto__" is not in the catalog vocabulary',
    ]);
  });
});
