import { afterEach, describe, expect, it, vi } from "vitest";
import type { Dataset } from "./schema";
import {
  checkProviderContract,
  validateProviderContracts,
} from "./provider-validation";

const validBodies = {
  "bls-public-data-api": JSON.stringify({
    status: "REQUEST_SUCCEEDED",
    Results: {
      series: [{ seriesID: "CUUR0000SA0", data: [{ year: "2025", period: "M01", value: "1" }] }],
    },
  }),
  "cisa-known-exploited-vulnerabilities": JSON.stringify({
    catalogVersion: "2026.08.11",
    dateReleased: "2026-08-11",
    vulnerabilities: [{
      cveID: "CVE-2026-0001",
      vendorProject: "Example",
      product: "Example",
      dateAdded: "2026-08-11",
    }],
  }),
  "federal-register-documents": JSON.stringify({
    count: 1,
    results: [{
      document_number: "2026-00001",
      title: "Example",
      type: "Rule",
      publication_date: "2026-08-11",
    }],
  }),
  "nasa-firms": "latitude,longitude,acq_date,frp\n1,2,2026-08-10,3",
  "natural-earth": new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
  "nhtsa-vehicle-recalls": JSON.stringify({
    Count: 1,
    results: [{
      NHTSACampaignNumber: "26V001",
      Component: "EQUIPMENT",
      Summary: "Example recall",
    }],
  }),
  "noaa-ncei-daily-summaries": JSON.stringify([
    { STATION: "USW00094728", DATE: "2025-07-01", TMAX: "89", TMIN: "72" },
  ]),
  "noaa-tides-currents": JSON.stringify({
    metadata: { id: "9414290", name: "San Francisco" },
    data: [{ t: "2025-01-01 00:00", v: "0.035" }],
  }),
  "openfda-drug-adverse-events": JSON.stringify({
    meta: { last_updated: "2026-07-30", results: { total: 1 } },
    results: [{
      safetyreportid: "1",
      receivedate: "20230101",
      patient: { reaction: [{ reactionmeddrapt: "Example" }] },
    }],
  }),
  "openfema-disaster-declarations": JSON.stringify({
    DisasterDeclarationsSummaries: [{
      disasterNumber: 1,
      declarationDate: "2026-08-11T00:00:00.000Z",
      state: "CA",
      declarationType: "DR",
    }],
  }),
  "polymarket-markets": JSON.stringify([
    { question: "Will it rain?", volume: "10", liquidity: 5 },
  ]),
  "usgs-earthquakes": JSON.stringify({
    features: [{ properties: { mag: null, place: null, time: 1 } }],
  }),
  "usgs-water-data": JSON.stringify({
    type: "FeatureCollection",
    features: [{
      properties: {
        monitoring_location_id: "USGS-01646500",
        parameter_code: "00060",
        time: "2025-01-01T00:00:00+00:00",
        value: "4510",
        unit_of_measure: "ft^3/s",
        approval_status: "Approved",
      },
    }],
  }),
  "treasury-securities-auctions": JSON.stringify({
    data: [{
      record_date: "2025-01-07",
      cusip: "912797NF0",
      security_type: "Bill",
      security_term: "4-Week",
      auction_date: "2025-01-02",
    }],
    meta: { count: 1 },
  }),
  "world-development-indicators": JSON.stringify([
    { page: 1, pages: 1, total: 1 },
    [{ countryiso3code: "USA", date: "2025", value: null }],
  ]),
} as const;

const contentTypes = {
  "bls-public-data-api": "application/json",
  "cisa-known-exploited-vulnerabilities": "application/json",
  "federal-register-documents": "application/json",
  "nasa-firms": "text/csv; charset=utf-8",
  "natural-earth": "application/zip",
  "nhtsa-vehicle-recalls": "application/json",
  "noaa-ncei-daily-summaries": "application/json",
  "noaa-tides-currents": "application/json",
  "openfda-drug-adverse-events": "application/json",
  "openfema-disaster-declarations": "application/json",
  "polymarket-markets": "application/json",
  "usgs-earthquakes": "application/json; charset=utf-8",
  "usgs-water-data": "application/geo+json",
  "treasury-securities-auctions": "application/json",
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
  it("validates configured contracts and skips unconfigured datasets", async () => {
    const datasets = [
      { id: "nasa-firms" },
      { id: "missing" },
      { id: "constructor" },
    ] as Dataset[];
    const fetchImpl = vi.fn().mockResolvedValue(
      response(validBodies["nasa-firms"], contentTypes["nasa-firms"]),
    );

    await expect(
      validateProviderContracts(datasets, { fetchImpl }),
    ).resolves.toEqual(new Map());
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
