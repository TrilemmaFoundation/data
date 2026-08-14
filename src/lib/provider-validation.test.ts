import { afterEach, describe, expect, it, vi } from "vitest";
import type { Dataset } from "./schema";
import {
  checkProviderContract,
  providerRequestFailure,
  validateProviderContracts,
} from "./provider-validation";

const validBodies = {
  "clinicaltrials-studies": JSON.stringify({
    studies: [{ protocolSection: { identificationModule: { nctId: "NCT00000001", briefTitle: "Example" } } }],
  }),
  "cms-care-compare-hospitals": JSON.stringify({
    count: 1,
    results: [{ facility_id: "000001", facility_name: "Example Hospital", state: "CA" }],
  }),
  "crossref-works": JSON.stringify({
    status: "ok",
    message: { items: [{ DOI: "10.0000/example", title: ["Example"] }] },
  }),
  "gbif-species-occurrences": JSON.stringify({
    count: 1,
    results: [{ key: 1, scientificName: "Danaus plexippus" }],
  }),
  "imf-world-economic-outlook": JSON.stringify({
    values: { NGDP_RPCH: { USA: { "2025": 2.1 } } },
  }),
  "mitre-attack-enterprise": JSON.stringify({
    objects: [{ id: "attack-pattern--example", type: "attack-pattern" }],
  }),
  "nasa-power-daily": JSON.stringify({
    geometry: { coordinates: [-112.074, 33.4484] },
    properties: { parameter: { T2M: { "20250701": 35.1 } } },
  }),
  "nvd-cve": JSON.stringify({
    totalResults: 1,
    vulnerabilities: [{ cve: { id: "CVE-2021-44228", published: "2021-12-10", lastModified: "2026-01-01" } }],
  }),
  "pubmed-citations": JSON.stringify({
    esearchresult: { count: "1", idlist: ["1"] },
  }),
  "unhcr-refugee-population": JSON.stringify({
    maxPages: 1,
    items: [{ year: 2024, refugees: 1 }],
  }),
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
  "nws-weather-api": JSON.stringify({
    properties: {
      forecastHourly: "https://api.weather.gov/gridpoints/OKX/33,37/forecast/hourly",
    },
  }),
  "cdc-places": JSON.stringify([
    { locationid: "06037", locationname: "Los Angeles", data_value: "10.1" },
  ]),
  "sec-edgar-apis": JSON.stringify({
    filings: { recent: { filingDate: ["2026-01-02"], form: ["8-K"] } },
  }),
  "kalshi-market-data": JSON.stringify({
    markets: [{ ticker: "KXTEST", title: "Example market" }],
  }),
  "cfpb-consumer-complaints": JSON.stringify({
    hits: { hits: [{ _source: { company: "Example Bank", product: "Mortgage" } }] },
  }),
  "openfda-food-enforcement": JSON.stringify({
    meta: { last_updated: "2026-07-30", results: { total: 1 } },
    results: [{
      recalling_firm: "Example Foods",
      product_description: "Example product",
      report_date: "20250115",
    }],
  }),
  "osv-open-source-vulnerabilities": JSON.stringify({
    id: "GHSA-c3g4-w6cv-6v7h",
    summary: "Example advisory",
  }),
  "eurostat-statistics": JSON.stringify({
    value: { "0": 3.2 },
    dimension: { time: { category: { index: { "2025-01": 0 } } } },
  }),
  "fhfa-house-price-index": "hpi_type,hpi_flavor,frequency,level,place_name\ntraditional,purchase-only,monthly,State,California",
  "nppes-npi-registry": JSON.stringify({
    results: [{ number: "1679576344" }],
  }),
  "wikimedia-pageviews": JSON.stringify({
    items: [{ timestamp: "2025080100", views: 1234 }],
  }),
  "arxiv-preprints": "<feed xmlns=\"http://www.w3.org/2005/Atom\"><title>ArXiv Query</title></feed>",
  "epa-echo-drinking-water": JSON.stringify({
    Results: { Systems: [{ PWSId: "RI0000001" }] },
  }),
  "noaa-ibtracs": "SID,NAME,ISO_TIME,LAT,LON\nNA0001,EXAMPLE,2025-01-01,20,60",
} as const;

const contentTypes = {
  "clinicaltrials-studies": "application/json",
  "cms-care-compare-hospitals": "application/json",
  "crossref-works": "application/json",
  "gbif-species-occurrences": "application/json",
  "imf-world-economic-outlook": "application/json",
  "mitre-attack-enterprise": "application/taxii+json;version=2.1",
  "nasa-power-daily": "application/json",
  "nvd-cve": "application/json",
  "pubmed-citations": "application/json",
  "unhcr-refugee-population": "application/json",
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
  "nws-weather-api": "application/geo+json",
  "cdc-places": "application/json",
  "sec-edgar-apis": "application/json",
  "kalshi-market-data": "application/json",
  "cfpb-consumer-complaints": "application/json",
  "openfda-food-enforcement": "application/json",
  "osv-open-source-vulnerabilities": "application/json",
  "eurostat-statistics": "application/json",
  "fhfa-house-price-index": "text/csv",
  "nppes-npi-registry": "application/json",
  "wikimedia-pageviews": "application/json",
  "arxiv-preprints": "application/atom+xml",
  "epa-echo-drinking-water": "application/json",
  "noaa-ibtracs": "text/csv",
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
      checkProviderContract("epa-echo-drinking-water", {
        fetchImpl: vi.fn().mockResolvedValue(response("{}", "application/json")),
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
      const payload = response(validBodies["nasa-firms"], "text/csv");
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
      .mockResolvedValueOnce(response(validBodies["nasa-firms"], contentTypes["nasa-firms"]));
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
      response(validBodies["nasa-firms"], contentTypes["nasa-firms"]),
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
        return response(validBodies["natural-earth"], contentTypes["natural-earth"]);
      }
      return response(validBodies["nasa-firms"], contentTypes["nasa-firms"]);
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
