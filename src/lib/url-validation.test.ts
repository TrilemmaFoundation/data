import { describe, expect, it, vi } from "vitest";
import { getAllDatasets } from "./datasets";
import type { Dataset } from "./schema";
import {
  checkUrl as checkUrlWithDns,
  createPinnedLookup,
  validateDatasetUrls,
} from "./url-validation";

const publicResolver = async () => [
  { address: "93.184.216.34", family: 4 },
];

function checkUrl(
  url: string,
  options: Parameters<typeof checkUrlWithDns>[1] = {},
) {
  return checkUrlWithDns(url, { resolveHost: publicResolver, ...options });
}

function pageResponse(
  body: BodyInit | null,
  url: string,
  status = 200,
): Response {
  const response = new Response(body, { status });
  Object.defineProperty(response, "url", { value: url });
  return response;
}

describe("checkUrl", () => {
  it("pins approved DNS results for the connection", () => {
    const callback = vi.fn();
    createPinnedLookup("93.184.216.34", 4)("example.com", {}, callback);
    expect(callback).toHaveBeenCalledWith(null, "93.184.216.34", 4);

    const allCallback = vi.fn();
    createPinnedLookup("2001:4860:4860::8888", 6)(
      "example.com",
      { all: true },
      allCallback,
    );
    expect(allCallback).toHaveBeenCalledWith(null, [
      { address: "2001:4860:4860::8888", family: 6 },
    ]);
  });

  it("accepts an IPv6-only public hostname", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      pageResponse("Expected page", "https://example.com/catalog"),
    );
    await expect(
      checkUrl("https://example.com/catalog", {
        fetchImpl: fetchImpl as typeof fetch,
        resolveHost: async () => [
          { address: "2001:4860:4860::8888", family: 6 },
        ],
        expectedMarker: "Expected page",
      }),
    ).resolves.toEqual({ ok: true, messages: [] });
  });

  it("falls back to GET and retries one transient failure", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 405 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const delay = vi.fn().mockResolvedValue(undefined);

    await expect(
      checkUrl("https://example.com", {
        fetchImpl: fetchImpl as typeof fetch,
        delay,
      }),
    ).resolves.toEqual({ ok: true, messages: [] });
    expect(fetchImpl.mock.calls.map(([, init]) => init?.method)).toEqual([
      "HEAD",
      "GET",
      "GET",
    ]);
    expect(delay).toHaveBeenCalledOnce();
  });

  it("accepts a reachable HEAD response without a GET", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    await expect(
      checkUrl("https://example.com", { fetchImpl: fetchImpl as typeof fetch }),
    ).resolves.toEqual({ ok: true, messages: [] });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("verifies the final host and page marker with a GET", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      pageResponse(
        "<title>Example DATASET Downloads</title>",
        "https://example.com/downloads",
      ),
    );
    await expect(
      checkUrl("https://example.com/catalog", {
        fetchImpl: fetchImpl as typeof fetch,
        expectedMarker: "Example Dataset Downloads",
      }),
    ).resolves.toEqual({ ok: true, messages: [] });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe("GET");
  });

  it("rejects redirects to another host", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      pageResponse("Expected page", "https://lookalike.example/catalog"),
    );
    await expect(
      checkUrl("https://example.com/catalog", {
        fetchImpl: fetchImpl as typeof fetch,
        expectedMarker: "Expected page",
      }),
    ).resolves.toEqual({
      ok: false,
      messages: [
        "https://example.com/catalog redirected to unexpected host lookalike.example",
      ],
    });
  });

  it("blocks cross-host redirects before requesting the destination", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("redirecting", {
        status: 302,
        headers: { location: "https://internal.example/private" },
      }),
    );
    await expect(
      checkUrl("https://example.com/catalog", {
        fetchImpl: fetchImpl as typeof fetch,
        expectedMarker: "Expected page",
      }),
    ).resolves.toEqual({
      ok: false,
      messages: [
        "https://internal.example/private redirected to unexpected host internal.example",
      ],
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("blocks HTTPS downgrade redirects before requesting them", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "http://example.com/private" },
      }),
    );
    await expect(
      checkUrl("https://example.com/catalog", {
        fetchImpl: fetchImpl as typeof fetch,
        expectedMarker: "Expected page",
      }),
    ).resolves.toEqual({
      ok: false,
      messages: [
        "http://example.com/private must use HTTPS without embedded credentials",
      ],
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("revalidates DNS on same-host redirects", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: "/final" } }),
      )
      .mockResolvedValueOnce(
        pageResponse("Expected page", "https://example.com/final"),
      );
    const resolveHost = vi.fn(publicResolver);
    await expect(
      checkUrl("https://example.com/catalog", {
        fetchImpl: fetchImpl as typeof fetch,
        resolveHost,
        expectedMarker: "Expected page",
      }),
    ).resolves.toEqual({ ok: true, messages: [] });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(resolveHost).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed and excessive redirects", async () => {
    const missingLocation = vi.fn().mockResolvedValue(
      new Response(null, { status: 302 }),
    );
    await expect(
      checkUrl("https://example.com/catalog", {
        fetchImpl: missingLocation as typeof fetch,
        expectedMarker: "Expected page",
      }),
    ).resolves.toEqual({
      ok: false,
      messages: [
        "https://example.com/catalog redirected without a Location header",
      ],
    });

    const looping = vi.fn().mockResolvedValue(
      new Response(null, { status: 302, headers: { location: "/again" } }),
    );
    await expect(
      checkUrl("https://example.com/catalog", {
        fetchImpl: looping as typeof fetch,
        expectedMarker: "Expected page",
      }),
    ).resolves.toEqual({
      ok: false,
      messages: ["https://example.com/catalog exceeded 5 redirects"],
    });
    expect(looping).toHaveBeenCalledTimes(6);
  });

  it.each([
    ["127.0.0.1", 4],
    ["10.0.0.1", 4],
    ["100.64.0.1", 4],
    ["169.254.169.254", 4],
    ["172.16.0.1", 4],
    ["192.168.0.1", 4],
    ["::1", 6],
    ["::ffff:127.0.0.1", 6],
    ["fc00::1", 6],
    ["fe80::1", 6],
    ["8.8.8.8", 0],
  ])("blocks unsafe resolved address %s", async (address, family) => {
    const fetchImpl = vi.fn();
    await expect(
      checkUrl("https://example.com/catalog", {
        fetchImpl: fetchImpl as typeof fetch,
        resolveHost: async () => [{ address, family }],
        expectedMarker: "Expected page",
      }),
    ).resolves.toEqual({
      ok: false,
      messages: [
        `https://example.com/catalog resolved to blocked address ${address}`,
      ],
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects empty DNS results and private literal addresses", async () => {
    const fetchImpl = vi.fn();
    await expect(
      checkUrl("https://example.com/catalog", {
        fetchImpl: fetchImpl as typeof fetch,
        resolveHost: async () => [],
        expectedMarker: "Expected page",
      }),
    ).resolves.toEqual({
      ok: false,
      messages: [
        "https://example.com/catalog did not resolve to an IP address",
      ],
    });
    await expect(
      checkUrlWithDns("https://127.0.0.1/catalog", {
        fetchImpl: fetchImpl as typeof fetch,
      }),
    ).resolves.toEqual({
      ok: false,
      messages: [
        "https://127.0.0.1/catalog resolved to blocked address 127.0.0.1",
      ],
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    "https://127.1/catalog",
    "https://2130706433/catalog",
    "https://[::1]/catalog",
    "https://[::ffff:127.0.0.1]/catalog",
  ])("blocks normalized private literal %s", async (url) => {
    const fetchImpl = vi.fn();
    const result = await checkUrlWithDns(url, {
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(result.ok).toBe(false);
    expect(result.messages[0]).toContain("resolved to blocked address");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects a hostname when any resolved address is private", async () => {
    const fetchImpl = vi.fn();
    const result = await checkUrl("https://example.com/catalog", {
      fetchImpl: fetchImpl as typeof fetch,
      resolveHost: async () => [
        { address: "93.184.216.34", family: 4 },
        { address: "10.0.0.1", family: 4 },
      ],
      expectedMarker: "Expected page",
    });
    expect(result).toEqual({
      ok: false,
      messages: [
        "https://example.com/catalog resolved to blocked address 10.0.0.1",
      ],
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects a reachable page with the wrong content", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      pageResponse("A generic landing page", "https://example.com/catalog"),
    );
    await expect(
      checkUrl("https://example.com/catalog", {
        fetchImpl: fetchImpl as typeof fetch,
        expectedMarker: "Expected dataset page",
      }),
    ).resolves.toEqual({
      ok: false,
      messages: [
        'https://example.com/catalog did not contain expected page marker "Expected dataset page"',
      ],
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("reports a wrong page returned after a transient retry", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        pageResponse("Generic page", "https://example.com/catalog"),
      );
    await expect(
      checkUrl("https://example.com/catalog", {
        fetchImpl: fetchImpl as typeof fetch,
        delay: vi.fn().mockResolvedValue(undefined),
        expectedMarker: "Expected dataset page",
      }),
    ).resolves.toEqual({
      ok: false,
      messages: [
        'https://example.com/catalog did not contain expected page marker "Expected dataset page"',
      ],
    });
  });

  it("uses the requested URL when a test response has no final URL", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("Expected dataset page", { status: 200 }));
    await expect(
      checkUrl("https://example.com/catalog", {
        fetchImpl: fetchImpl as typeof fetch,
        expectedMarker: "Expected dataset page",
      }),
    ).resolves.toEqual({ ok: true, messages: [] });
  });

  it("rejects an oversized page before searching it", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      pageResponse("x".repeat(1_000_001), "https://example.com/catalog"),
    );
    await expect(
      checkUrl("https://example.com/catalog", {
        fetchImpl: fetchImpl as typeof fetch,
        expectedMarker: "Expected dataset page",
      }),
    ).resolves.toEqual({
      ok: false,
      messages: ["https://example.com/catalog response exceeds 1000000 bytes"],
    });
  });

  it.each([401, 403])("rejects unapproved HTTP %s responses", async (status) => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status }));
    await expect(
      checkUrl("https://example.com/protected", {
        fetchImpl: fetchImpl as typeof fetch,
      }),
    ).resolves.toEqual({
      ok: false,
      messages: [`https://example.com/protected returned HTTP ${status}`],
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it.each([
    [
      "https://www.usgs.gov/data-management/data-licensing",
      403,
      "USGS CloudFront blocks automated validation from some regions",
      "2026-11-08",
      2,
    ],
    [
      "https://www.earthdata.nasa.gov/engage/open-data-services-software/data-use-policy",
      403,
      "NASA Earthdata blocks automated validation from GitHub Actions",
      "2026-11-08",
      2,
    ],
    [
      "https://kalshi.com/developer-agreement",
      429,
      "Kalshi rate-limits automated validation from GitHub Actions",
      "2026-11-09",
      4,
    ],
    [
      "https://www.nhtsa.gov/nhtsa-datasets-and-apis",
      403,
      "NHTSA blocks automated validation from some regions",
      "2026-11-09",
      2,
    ],
    [
      "https://www.nhtsa.gov/about-nhtsa/terms-use",
      403,
      "NHTSA blocks automated validation from some regions",
      "2026-11-09",
      2,
    ],
    [
      "https://www.noaa.gov/disclaimer",
      403,
      "NOAA blocks automated validation from some regions",
      "2026-11-09",
      2,
    ],
  ])(
    "allows an exact, unexpired protected-URL exception for %s",
    async (url, status, reason, expires, expectedAttempts) => {
      const fetchImpl = vi
        .fn()
        .mockResolvedValue(new Response(null, { status }));
      await expect(
        checkUrl(url, {
          fetchImpl: fetchImpl as typeof fetch,
          today: new Date("2026-08-10T00:00:00Z"),
        }),
      ).resolves.toEqual({
        ok: true,
        messages: [],
        warnings: [
          `${url} returned HTTP ${status}; allowed until ${expires}: ${reason}`,
        ],
      });
      expect(fetchImpl).toHaveBeenCalledTimes(expectedAttempts);
    },
  );

  it("rejects an expired protected-URL exception", async () => {
    const url = "https://www.usgs.gov/data-management/data-licensing";
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 403 }));
    await expect(
      checkUrl(url, {
        fetchImpl: fetchImpl as typeof fetch,
        today: new Date("2026-11-09T00:00:00Z"),
      }),
    ).resolves.toEqual({
      ok: false,
      messages: [`${url} returned HTTP 403`],
    });
  });

  it("accepts the first GET response", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 405 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    await expect(
      checkUrl("https://example.com", { fetchImpl: fetchImpl as typeof fetch }),
    ).resolves.toEqual({ ok: true, messages: [] });
  });

  it("uses both retry delays before reporting a transient HTTP failure", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 405 }))
      .mockResolvedValue(new Response(null, { status: 503 }));
    const delay = vi.fn().mockResolvedValue(undefined);

    await expect(
      checkUrl("https://example.com/busy", {
        fetchImpl: fetchImpl as typeof fetch,
        delay,
      }),
    ).resolves.toEqual({
      ok: false,
      messages: ["https://example.com/busy returned HTTP 503"],
    });
    expect(delay.mock.calls).toEqual([[250], [750]]);
  });

  it("reports Error and non-Error network failures", async () => {
    const errorFetch = vi.fn().mockRejectedValue(new Error("offline"));
    const textFetch = vi.fn().mockRejectedValue("no route");
    const delay = vi.fn().mockResolvedValue(undefined);

    await expect(
      checkUrl("https://example.com", {
        fetchImpl: errorFetch as typeof fetch,
        delay,
      }),
    ).resolves.toEqual({
      ok: false,
      messages: ["GET https://example.com: offline"],
    });
    await expect(
      checkUrl("https://example.com", {
        fetchImpl: textFetch as typeof fetch,
        delay,
      }),
    ).resolves.toEqual({
      ok: false,
      messages: ["GET https://example.com: no route"],
    });
  });

  it("ignores response-body cancellation failures", async () => {
    const response = {
      status: 204,
      body: { cancel: vi.fn().mockRejectedValue(new Error("already closed")) },
    } as unknown as Response;
    const fetchImpl = vi.fn().mockResolvedValue(response);
    await expect(
      checkUrl("https://example.com", { fetchImpl: fetchImpl as typeof fetch }),
    ).resolves.toEqual({ ok: true, messages: [] });
  });

  it("uses the global fetch and default delay", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 405 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchImpl);
    const result = checkUrl("https://example.com");
    await vi.advanceTimersByTimeAsync(250);
    await expect(result).resolves.toEqual({ ok: true, messages: [] });
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("aborts requests that exceed the timeout", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      }),
    );
    const pending = checkUrl("https://example.com/slow", {
      fetchImpl: fetchImpl as typeof fetch,
      delay: vi.fn().mockResolvedValue(undefined),
    });
    for (let attempt = 0; attempt < 4; attempt++) {
      await vi.advanceTimersByTimeAsync(10_000);
    }
    await expect(pending).resolves.toEqual({
      ok: false,
      messages: ["GET https://example.com/slow: aborted"],
    });
    vi.useRealTimers();
  });

  it("does not retry a permanent GET failure", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 405 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));

    await expect(
      checkUrl("https://example.com/missing", {
        fetchImpl: fetchImpl as typeof fetch,
      }),
    ).resolves.toEqual({
      ok: false,
      messages: ["https://example.com/missing returned HTTP 404"],
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("validateDatasetUrls", () => {
  it("uses page markers with the default checker", async () => {
    const dataset = {
      id: "one",
      url: "https://example.com/one",
      license_url: "https://example.com/license",
      url_checks: { source_marker: "Dataset One", license_marker: "Terms One" },
    } as Dataset;
    const fetchImpl = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      expect(init).toHaveProperty("dispatcher");
      const url = String(input);
      const marker = url.endsWith("license") ? "Terms One" : "Dataset One";
      return Promise.resolve(pageResponse(marker, url));
    });
    vi.stubGlobal("fetch", fetchImpl);

    await expect(
      validateDatasetUrls([dataset], { resolveHost: publicResolver }),
    ).resolves.toEqual({
      errors: new Map(),
      warnings: new Map(),
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });

  it("handles an empty catalog and normalizes zero concurrency", async () => {
    await expect(validateDatasetUrls([])).resolves.toEqual({
      errors: new Map(),
      warnings: new Map(),
    });
    const checker = vi.fn().mockResolvedValue({ ok: true, messages: [] });
    const dataset = {
      id: "one",
      url: "https://example.com/one",
      license_url: "https://example.com/license",
      url_checks: { source_marker: "One", license_marker: "License" },
    } as Dataset;
    await expect(
      validateDatasetUrls([dataset], { checker, concurrency: 0 }),
    ).resolves.toEqual({ errors: new Map(), warnings: new Map() });
    expect(checker).toHaveBeenCalledTimes(2);
  });
  it("checks each unique current-catalog URL and marker pair once", async () => {
    const datasets = getAllDatasets();
    const uniquePageCheckCount = new Set(
      datasets.flatMap((dataset) => [
        JSON.stringify([dataset.url, dataset.url_checks.source_marker]),
        JSON.stringify([
          dataset.license_url,
          dataset.url_checks.license_marker,
        ]),
      ]),
    ).size;
    const calls: Array<[string, string]> = [];
    const result = await validateDatasetUrls(datasets, {
      checker: async (url, marker) => {
        calls.push([url, marker]);
        return { ok: true, messages: [] };
      },
    });

    expect(calls).toHaveLength(uniquePageCheckCount);
    expect(new Set(calls.map((call) => JSON.stringify(call))).size).toBe(
      uniquePageCheckCount,
    );
    expect(calls.every(([, marker]) => marker.length > 0)).toBe(true);
    expect(result).toEqual({ errors: new Map(), warnings: new Map() });
  });

  it("checks shared URLs once with bounded concurrency and attributes failures", async () => {
    const datasets = [
      {
        id: "one",
        url: "https://example.com/one",
        license_url: "https://example.com/license",
        url_checks: { source_marker: "One", license_marker: "Terms" },
      },
      {
        id: "two",
        url: "https://example.com/two",
        license_url: "https://example.com/license",
        url_checks: { source_marker: "Two", license_marker: "Terms" },
      },
    ] as Dataset[];
    const calls: string[] = [];
    let inFlight = 0;
    let maxInFlight = 0;
    const checker = async (url: string) => {
      calls.push(url);
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight -= 1;
      return url.endsWith("license")
        ? { ok: false, messages: ["license unavailable"] }
        : { ok: true, messages: [] };
    };

    const result = await validateDatasetUrls(datasets, {
      checker,
      concurrency: 2,
    });

    expect(new Set(calls)).toEqual(
      new Set([
        "https://example.com/one",
        "https://example.com/two",
        "https://example.com/license",
      ]),
    );
    expect(calls).toHaveLength(3);
    expect(maxInFlight).toBe(2);
    expect(result.errors).toEqual(
      new Map([
        ["one.yaml", ["license unavailable"]],
        ["two.yaml", ["license unavailable"]],
      ]),
    );
    expect(result.warnings).toEqual(new Map());
  });

  it("attributes URL warnings to every owning dataset", async () => {
    const dataset = {
      id: "one",
      url: "https://example.com/shared",
      license_url: "https://example.com/shared",
      url_checks: { source_marker: "Shared", license_marker: "Shared" },
    } as Dataset;
    const result = await validateDatasetUrls([dataset], {
      checker: async () => ({
        ok: true,
        messages: [],
        warnings: ["protected endpoint"],
      }),
    });

    expect(result).toEqual({
      errors: new Map(),
      warnings: new Map([["one.yaml", ["protected endpoint"]]]),
    });
  });
});
