import { describe, expect, it, vi } from "vitest";
import { changedProviderFiles } from "./maintenance-history";

describe("changedProviderFiles", () => {
  it("keeps current dataset files and separately reports contract changes", () => {
    const runGit = vi
      .fn()
      .mockReturnValueOnce({
        status: 0,
        stdout: [
          "data/datasets/current.yaml",
          "data/datasets/current.yaml",
          "data/datasets/deleted.yaml",
          "data/datasets/_template.yaml",
          "data/datasets/nested/_hidden.yaml",
          "data/datasets/notes.md",
          "README.md",
        ].join("\n"),
      })
      .mockReturnValueOnce({ status: 0, stdout: "abc123\n" });
    expect(changedProviderFiles({
      runGit,
      exists: (file) => file.endsWith("current.yaml"),
    })).toEqual([
      "data/datasets/current.yaml",
      "src/lib/provider-contracts.ts",
    ]);
    expect(runGit).toHaveBeenCalledTimes(2);
    expect(runGit.mock.calls[0]?.[0]).toEqual(expect.arrayContaining([
      "-G",
      "^(url:|license_url:)",
      "data/datasets",
    ]));
    expect(runGit.mock.calls[1]?.[0]).toEqual(expect.arrayContaining([
      "src/lib/provider-contracts.ts",
    ]));
  });

  it("omits the contract file when provider-contracts.ts did not change", () => {
    const runGit = vi
      .fn()
      .mockReturnValueOnce({
        status: 0,
        stdout: "data/datasets/current.yaml\n",
      })
      .mockReturnValueOnce({ status: 0, stdout: "" });
    expect(changedProviderFiles({
      runGit,
      exists: () => true,
    })).toEqual(["data/datasets/current.yaml"]);
  });

  it("omits the contract file when the contract history lookup fails", () => {
    const runGit = vi
      .fn()
      .mockReturnValueOnce({
        status: 0,
        stdout: "data/datasets/current.yaml\n",
      })
      .mockReturnValueOnce({ status: 1, stdout: "abc123\n" });
    expect(changedProviderFiles({
      runGit,
      exists: () => true,
    })).toEqual(["data/datasets/current.yaml"]);
  });

  it("sorts mixed dataset and contract changes", () => {
    const runGit = vi
      .fn()
      .mockReturnValueOnce({
        status: 0,
        stdout: "data/datasets/zeta.yaml\ndata/datasets/alpha.yaml\n",
      })
      .mockReturnValueOnce({ status: 0, stdout: "abc123\n" });
    expect(changedProviderFiles({
      runGit,
      exists: () => true,
    })).toEqual([
      "data/datasets/alpha.yaml",
      "data/datasets/zeta.yaml",
      "src/lib/provider-contracts.ts",
    ]);
  });

  it("returns no entries when git history is unavailable", () => {
    const runGit = vi.fn().mockReturnValue({ status: 1, stdout: "" });
    expect(changedProviderFiles({ runGit, exists: () => true })).toEqual([]);
  });
});
