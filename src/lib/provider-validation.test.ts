import { afterEach, describe, expect, it, vi } from "vitest";
import type { Dataset } from "./schema";
import {
  checkProviderContract,
  validateProviderContracts,
} from "./provider-validation";

const validBodies = {
  "nasa-firms": "latitude,longitude,acq_date,frp\n1,2,2026-08-10,3",
  "natural-earth": new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
  "polymarket-markets": JSON.stringify([
    { question: "Will it rain?", volume: "10", liquidity: 5 },
  ]),
  "usgs-earthquakes": JSON.stringify({
    features: [{ properties: { mag: null, place: null, time: 1 } }],
  }),
  "world-development-indicators": JSON.stringify([
    { page: 1, pages: 1, total: 1 },
    [{ countryiso3code: "USA", date: "2025", value: null }],
  ]),
} as const;

const contentTypes = {
  "nasa-firms": "text/csv; charset=utf-8",
  "natural-earth": "application/zip",
  "polymarket-markets": "application/json",
  "usgs-earthquakes": "application/json; charset=utf-8",
  "world-development-indicators": "application/json",
} as const;

function response(
  body: BodyInit | null,
  contentType?: string,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(body, {
    status,
    headers: { ...(contentType ? { "content-type": contentType } : {}), ...extraHeaders },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("checkProviderContract", () => {
  it.each(Object.keys(validBodies) as Array<keyof typeof validBodies>)(
    "accepts the %s provider contract",
    async (datasetId) => {
      const fetchImpl = vi.fn().mockResolvedValue(
        response(validBodies[datasetId], contentTypes[datasetId]),
      );
      await expect(checkProviderContract(datasetId, { fetchImpl })).resolves.toEqual([]);
      expect(fetchImpl).toHaveBeenCalledOnce();
    },
  );

  it("uses global fetch and default options", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response(validBodies["nasa-firms"], "text/plain")),
    );
    await expect(checkProviderContract("nasa-firms")).resolves.toEqual([]);
  });

  it("requires a contract for every dataset", async () => {
    await expect(checkProviderContract("unknown")).resolves.toEqual([
      "no provider contract is defined for unknown",
    ]);
  });

  it("reports HTTP, declared-size, actual-size, and content-type failures", async () => {
    await expect(
      checkProviderContract("nasa-firms", {
        fetchImpl: vi.fn().mockResolvedValue(response("no", "text/plain", 503)),
      }),
    ).resolves.toEqual(["provider contract returned HTTP 503"]);

    await expect(
      checkProviderContract("nasa-firms", {
        fetchImpl: vi.fn().mockResolvedValue(
          response("no", "text/plain", 200, { "content-length": "1000001" }),
        ),
      }),
    ).resolves.toEqual(["provider response exceeds 1000000 bytes"]);

    await expect(
      checkProviderContract("nasa-firms", {
        fetchImpl: vi.fn().mockResolvedValue(response(new Uint8Array(1_000_001), "text/csv")),
      }),
    ).resolves.toEqual(["provider response exceeds 1000000 bytes"]);

    await expect(
      checkProviderContract("nasa-firms", {
        fetchImpl: vi.fn().mockResolvedValue(response(new Uint8Array([1]), undefined)),
      }),
    ).resolves.toEqual(["unexpected provider content type: missing"]);

    await expect(
      checkProviderContract("nasa-firms", {
        fetchImpl: vi.fn().mockResolvedValue(response(null, "text/csv")),
      }),
    ).resolves.toEqual([
      "CSV is missing latitude, longitude, acq_date, or frp",
    ]);
  });

  it("reports malformed and mismatched provider payloads", async () => {
    await expect(
      checkProviderContract("polymarket-markets", {
        fetchImpl: vi.fn().mockResolvedValue(response("{", "application/json")),
      }),
    ).resolves.toEqual(["response is not valid JSON"]);

    await expect(
      checkProviderContract("polymarket-markets", {
        fetchImpl: vi.fn().mockResolvedValue(response("[]", "application/json")),
      }),
    ).resolves.toEqual([
      expect.stringContaining("response contract mismatch"),
    ]);

    await expect(
      checkProviderContract("nasa-firms", {
        fetchImpl: vi.fn().mockResolvedValue(response("latitude", "application/octet-stream")),
      }),
    ).resolves.toEqual([
      "CSV is missing latitude, longitude, acq_date, or frp",
    ]);

    await expect(
      checkProviderContract("natural-earth", {
        fetchImpl: vi.fn().mockResolvedValue(response("HTML", "application/octet-stream")),
      }),
    ).resolves.toEqual(["download is not a ZIP archive"]);
  });

  it("reports Error and non-Error request failures", async () => {
    await expect(
      checkProviderContract("nasa-firms", {
        fetchImpl: vi.fn().mockRejectedValue(new Error("offline")),
      }),
    ).resolves.toEqual(["provider contract request failed: offline"]);
    await expect(
      checkProviderContract("nasa-firms", {
        fetchImpl: vi.fn().mockRejectedValue("no route"),
      }),
    ).resolves.toEqual(["provider contract request failed: no route"]);
  });

  it("aborts a provider request at the timeout", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      }),
    );
    const pending = checkProviderContract("nasa-firms", {
      fetchImpl: fetchImpl as typeof fetch,
      timeoutMs: 5,
    });
    await vi.advanceTimersByTimeAsync(5);
    await expect(pending).resolves.toEqual([
      "provider contract request failed: aborted",
    ]);
  });
});

describe("validateProviderContracts", () => {
  it("returns only dataset-attributed failures", async () => {
    const datasets = [
      { id: "nasa-firms" },
      { id: "missing" },
    ] as Dataset[];
    const fetchImpl = vi.fn().mockResolvedValue(
      response(validBodies["nasa-firms"], contentTypes["nasa-firms"]),
    );

    await expect(
      validateProviderContracts(datasets, { fetchImpl }),
    ).resolves.toEqual(
      new Map([["missing.yaml", ["no provider contract is defined for missing"]]]),
    );
  });
});
