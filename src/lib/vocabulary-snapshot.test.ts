import { describe, expect, it } from "vitest";
import {
  canonicalizeSnapshotValue,
  EMPTY_VOCABULARY_SNAPSHOT,
  resolveSnapshotAlias,
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
  });
});
