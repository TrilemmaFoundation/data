import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  getMaintainers,
  loadMaintainers,
  maintainerForDataset,
  parseMaintainers,
  validateMaintainerOverrides,
} from "./maintainers";

describe("maintainers", () => {
  it("loads the repository registry and routes by override", () => {
    const registry = getMaintainers();
    expect(registry.routing.default).toBe("trilemma");
    expect(maintainerForDataset("nws-weather-api", registry).id).toBe("trilemma");
    expect(validateMaintainerOverrides(["nws-weather-api"], registry)).toEqual([]);
  });

  it("rejects invalid registries and unknown routing", () => {
    expect(parseMaintainers({}).errors.length).toBeGreaterThan(0);
    expect(
      parseMaintainers({
        maintainers: [
          { id: "trilemma", label: "Trilemma Data", contact: "https://example.com" },
          { id: "trilemma", label: "Duplicate", contact: "https://example.com" },
        ],
        routing: { default: "trilemma", overrides: {} },
      }).errors,
    ).toContain("maintainer ids must be unique");
    expect(
      parseMaintainers({
        maintainers: [
          { id: "trilemma", label: "Trilemma Data", contact: "https://example.com" },
        ],
        routing: { default: "missing", overrides: {} },
      }).errors[0],
    ).toContain("routing.default");
    expect(
      parseMaintainers({
        maintainers: [
          { id: "trilemma", label: "Trilemma Data", contact: "https://example.com" },
        ],
        routing: { default: "trilemma", overrides: { "nws-weather-api": "ghost" } },
      }).errors[0],
    ).toContain("unknown maintainer");
    expect(
      validateMaintainerOverrides(["nws-weather-api"], {
        maintainers: [
          { id: "trilemma", label: "Trilemma Data", contact: "https://example.com" },
        ],
        routing: { default: "trilemma", overrides: { missing: "trilemma" } },
      }),
    ).toEqual(["routing.overrides.missing does not match a catalog dataset"]);
  });

  it("reports missing and malformed files", () => {
    expect(loadMaintainers(path.join(os.tmpdir(), "missing-maintainers.yaml")).errors[0])
      .toContain("does not exist");
    expect(parseMaintainers(null).errors[0]).toContain("(root)");
    const file = path.join(os.tmpdir(), `maintainers-${Date.now()}.yaml`);
    fs.writeFileSync(file, "maintainers: []\n");
    const stringThrow = vi.spyOn(fs, "readFileSync").mockImplementationOnce(() => {
      throw "disk unavailable";
    });
    expect(loadMaintainers(file).errors[0]).toContain("disk unavailable");
    stringThrow.mockRestore();
    const errorThrow = vi.spyOn(fs, "readFileSync").mockImplementationOnce(() => {
      throw new Error("disk unavailable");
    });
    expect(loadMaintainers(file).errors[0]).toContain("disk unavailable");
    errorThrow.mockRestore();
    fs.rmSync(file, { force: true });
    expect(() => getMaintainers(path.join(os.tmpdir(), "missing-maintainers.yaml"))).toThrow(
      /Invalid maintainers registry/,
    );
  });

  it("throws when a routed maintainer is missing from a mutated registry", () => {
    const registry = getMaintainers();
    expect(() =>
      maintainerForDataset("nws-weather-api", {
        ...registry,
        maintainers: [],
      }),
    ).toThrow(/Missing maintainer/);
  });
});
