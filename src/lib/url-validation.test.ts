import { describe, expect, it, vi } from "vitest";
import { getAllDatasets } from "./datasets";
import type { Dataset } from "./schema";
import { checkUrl, validateDatasetUrls } from "./url-validation";

describe("checkUrl", () => {
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
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 301 }));
    await expect(
      checkUrl("https://example.com", { fetchImpl: fetchImpl as typeof fetch }),
    ).resolves.toEqual({ ok: true, messages: [] });
    expect(fetchImpl).toHaveBeenCalledOnce();
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

  it("allows an exact, unexpired protected-URL exception after trying GET", async () => {
    const url = "https://www.usgs.gov/data-management/data-licensing";
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 403 }));
    await expect(
      checkUrl(url, {
        fetchImpl: fetchImpl as typeof fetch,
        today: new Date("2026-08-10T00:00:00Z"),
      }),
    ).resolves.toEqual({
      ok: true,
      messages: [],
      warnings: [
        `${url} returned HTTP 403; allowed until 2026-11-08: USGS CloudFront blocks automated validation from some regions`,
      ],
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

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
    } as Dataset;
    await expect(
      validateDatasetUrls([dataset], { checker, concurrency: 0 }),
    ).resolves.toEqual({ errors: new Map(), warnings: new Map() });
    expect(checker).toHaveBeenCalledTimes(2);
  });
  it("checks each unique current-catalog URL once", async () => {
    const datasets = getAllDatasets();
    const uniqueUrlCount = new Set(
      datasets.flatMap((dataset) => [dataset.url, dataset.license_url]),
    ).size;
    const calls: string[] = [];
    const result = await validateDatasetUrls(datasets, {
      checker: async (url) => {
        calls.push(url);
        return { ok: true, messages: [] };
      },
    });

    expect(calls).toHaveLength(uniqueUrlCount);
    expect(new Set(calls).size).toBe(uniqueUrlCount);
    expect(result).toEqual({ errors: new Map(), warnings: new Map() });
  });

  it("checks shared URLs once with bounded concurrency and attributes failures", async () => {
    const datasets = [
      {
        id: "one",
        url: "https://example.com/one",
        license_url: "https://example.com/license",
      },
      {
        id: "two",
        url: "https://example.com/two",
        license_url: "https://example.com/license",
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
