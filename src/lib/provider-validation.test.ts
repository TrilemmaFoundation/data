import { afterEach, describe, expect, it, vi } from "vitest";
import type { Dataset } from "./schema";
import { providerContracts } from "./provider-contracts";
import {
  checkProviderContract,
  providerRequestFailure,
  validateProviderContracts,
} from "./provider-validation";

const nasaFirms = providerContracts["nasa-firms"];
const naturalEarth = providerContracts["natural-earth"];
const usgs = providerContracts["usgs-earthquakes"];
const mitre = providerContracts["mitre-attack-enterprise"];

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
  it.each(Object.entries(providerContracts))(
    "accepts the %s provider contract",
    async (datasetId, contract) => {
      const fetchImpl = vi.fn().mockResolvedValue(
        response(contract.valid.body, contract.valid.contentType),
      );
      await expect(checkProviderContract(datasetId, { fetchImpl })).resolves.toEqual([]);
      expect(fetchImpl).toHaveBeenCalledOnce();
      const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
      expect(init.headers).toMatchObject({
        Accept: contract.contentTypes.join(", "),
      });
      if (contract.range) {
        expect(init.headers).toMatchObject({ Range: contract.range });
      } else {
        expect(init.headers).not.toHaveProperty("Range");
      }
    },
  );

  it("uses global fetch and default options", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response(nasaFirms.valid.body, nasaFirms.valid.contentType)),
    );
    await expect(
      checkProviderContract("nasa-firms", {
        resolveHost: async () => [{ address: "93.184.216.34", family: 4 }],
      }),
    ).resolves.toEqual([]);
  });

  it.each(["unknown", "constructor"])(
    "rejects a direct check without a configured provider contract: %s",
    async (datasetId) => {
      await expect(checkProviderContract(datasetId)).resolves.toEqual([
        `no provider contract is defined for ${datasetId}`,
      ]);
    },
  );

  it("reports HTTP, declared-size, actual-size, and content-type failures", async () => {
    await expect(
      checkProviderContract("nasa-firms", {
        fetchImpl: vi.fn().mockResolvedValue(response("no", "text/plain", 503)),
      }),
    ).resolves.toEqual(["provider contract returned HTTP 503"]);

    await expect(
      checkProviderContract("nasa-firms", {
        fetchImpl: vi.fn().mockResolvedValue(
          response("no", "text/plain", 200, { "content-length": "2000001" }),
        ),
      }),
    ).resolves.toEqual(["provider response exceeds 2000000 bytes"]);

    await expect(
      checkProviderContract("nasa-firms", {
        fetchImpl: vi.fn().mockResolvedValue(response(new Uint8Array(2_000_001), "text/csv")),
      }),
    ).resolves.toEqual(["provider response exceeds 2000000 bytes"]);

    await expect(
      checkProviderContract("nasa-firms", {
        fetchImpl: vi.fn().mockResolvedValue(response(new Uint8Array([1]), undefined)),
      }),
    ).resolves.toEqual(["unexpected provider content type: missing"]);

    await expect(
      checkProviderContract("usgs-earthquakes", {
        fetchImpl: vi.fn().mockResolvedValue(
          response(usgs.valid.body, "application/jsonp"),
        ),
      }),
    ).resolves.toEqual(["unexpected provider content type: application/jsonp"]);

    await expect(
      checkProviderContract("usgs-earthquakes", {
        fetchImpl: vi.fn().mockResolvedValue(
          response(usgs.valid.body, "application/jsonp; charset=utf-8"),
        ),
      }),
    ).resolves.toEqual([
      "unexpected provider content type: application/jsonp; charset=utf-8",
    ]);

    await expect(
      checkProviderContract("usgs-earthquakes", {
        fetchImpl: vi.fn().mockResolvedValue(
          response(usgs.valid.body, "application/json ; charset=utf-8"),
        ),
      }),
    ).resolves.toEqual([]);

    await expect(
      checkProviderContract("mitre-attack-enterprise", {
        fetchImpl: vi.fn().mockResolvedValue(
          response(mitre.valid.body, "application/taxii+json;version=2.1"),
        ),
      }),
    ).resolves.toEqual([]);

    await expect(
      checkProviderContract("nasa-firms", {
        fetchImpl: vi.fn().mockResolvedValue(response(null, "text/csv")),
      }),
    ).resolves.toEqual([nasaFirms.invalid.expectedError]);
  });

  it("reports malformed and mismatched provider payloads", async () => {
    await expect(
      checkProviderContract("polymarket-markets", {
        fetchImpl: vi.fn().mockResolvedValue(response("{", "application/json")),
      }),
    ).resolves.toEqual(["response is not valid JSON"]);

    const polymarket = providerContracts["polymarket-markets"];
    await expect(
      checkProviderContract("polymarket-markets", {
        fetchImpl: vi.fn().mockResolvedValue(
          response(polymarket.invalid.body, polymarket.invalid.contentType),
        ),
      }),
    ).resolves.toEqual([expect.stringMatching(polymarket.invalid.expectedError)]);

    await expect(
      checkProviderContract("epa-echo-drinking-water", {
        fetchImpl: vi.fn().mockResolvedValue(response("{}", "application/json")),
      }),
    ).resolves.toEqual([
      expect.stringContaining("response contract mismatch"),
    ]);

    await expect(
      checkProviderContract("nasa-firms", {
        fetchImpl: vi.fn().mockResolvedValue(
          response(nasaFirms.invalid.body, "application/octet-stream"),
        ),
      }),
    ).resolves.toEqual([nasaFirms.invalid.expectedError]);

    await expect(
      checkProviderContract("natural-earth", {
        fetchImpl: vi.fn().mockResolvedValue(
          response(naturalEarth.invalid.body, "application/octet-stream"),
        ),
      }),
    ).resolves.toEqual([naturalEarth.invalid.expectedError]);

    await expect(
      checkProviderContract("noaa-gml-co2", {
        fetchImpl: vi.fn().mockResolvedValue(
          response("year,month,deseasonalized\n2026,1,425.50\n", "text/csv"),
        ),
      }),
    ).resolves.toEqual([]);
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

  it("formats provider request failures without a GET prefix", () => {
    const url = "https://example.com/data";
    expect(providerRequestFailure(url, null)).toBe(
      "provider contract request failed: unknown",
    );
    expect(providerRequestFailure(url, "denied")).toBe(
      "provider contract request failed: denied",
    );
    expect(providerRequestFailure(url, `GET ${url}: offline`)).toBe(
      "provider contract request failed: offline",
    );
  });

  it("reports unexpected errors while reading a provider response", async () => {
    const exploding = (error: unknown) => {
      const payload = response(nasaFirms.valid.body, nasaFirms.valid.contentType);
      Object.defineProperty(payload, "body", {
        get() {
          throw error;
        },
      });
      return payload;
    };

    await expect(
      checkProviderContract("nasa-firms", {
        fetchImpl: vi.fn().mockResolvedValue(exploding(new Error("stream exploded"))),
      }),
    ).resolves.toEqual(["provider contract request failed: stream exploded"]);
    await expect(
      checkProviderContract("nasa-firms", {
        fetchImpl: vi.fn().mockResolvedValue(exploding("stream exploded")),
      }),
    ).resolves.toEqual(["provider contract request failed: stream exploded"]);
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

  it("keeps the provider timeout active while reading the body", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("latitude,longitude\n"));
          },
        }),
        { headers: { "content-type": nasaFirms.valid.contentType } },
      ),
    );
    const pending = checkProviderContract("nasa-firms", {
      fetchImpl: fetchImpl as typeof fetch,
      timeoutMs: 5,
    });
    await vi.advanceTimersByTimeAsync(5);
    await expect(pending).resolves.toEqual([
      "provider contract request failed: This operation was aborted",
    ]);
    vi.useRealTimers();
  });

  it("rejects a cross-host redirect and follows a same-host redirect", async () => {
    await expect(
      checkProviderContract("nasa-firms", {
        fetchImpl: vi.fn().mockResolvedValue(
          new Response(null, {
            status: 302,
            headers: { location: "https://evil.example/x" },
          }),
        ),
      }),
    ).resolves.toEqual([
      "https://firms.modaps.eosdis.nasa.gov/content/notebooks/sample_viirs_snpp_071223.csv redirected to unexpected host evil.example",
    ]);

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: {
            location: "/content/notebooks/sample_viirs_snpp_071223.csv",
          },
        }),
      )
      .mockResolvedValueOnce(response(nasaFirms.valid.body, nasaFirms.valid.contentType));
    await expect(checkProviderContract("nasa-firms", { fetchImpl })).resolves.toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("validateProviderContracts", () => {
  it("validates configured contracts and skips unconfigured datasets", async () => {
    const datasets = [
      { id: "nasa-firms" },
      { id: "missing" },
      { id: "constructor" },
    ] as Dataset[];
    const fetchImpl = vi.fn().mockResolvedValue(
      response(nasaFirms.valid.body, nasaFirms.valid.contentType),
    );

    await expect(
      validateProviderContracts(datasets, { fetchImpl }),
    ).resolves.toEqual(new Map());
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("runs provider checks with bounded concurrency", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 20));
      inFlight -= 1;
      const url = String(input);
      if (url.includes("naturalearth")) {
        return response(naturalEarth.valid.body, naturalEarth.valid.contentType);
      }
      return response(nasaFirms.valid.body, nasaFirms.valid.contentType);
    });

    await expect(
      validateProviderContracts(
        [{ id: "nasa-firms" }, { id: "natural-earth" }] as Dataset[],
        { fetchImpl, concurrency: 1 },
      ),
    ).resolves.toEqual(new Map());
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(maxInFlight).toBe(1);
  });
});
