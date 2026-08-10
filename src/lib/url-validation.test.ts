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
  it("checks each unique current-catalog URL once", async () => {
    const datasets = getAllDatasets();
    const uniqueUrlCount = new Set(
      datasets.flatMap((dataset) => [dataset.url, dataset.license_url]),
    ).size;
    const calls: string[] = [];
    const errors = await validateDatasetUrls(datasets, {
      checker: async (url) => {
        calls.push(url);
        return { ok: true, messages: [] };
      },
    });

    expect(calls).toHaveLength(uniqueUrlCount);
    expect(new Set(calls).size).toBe(uniqueUrlCount);
    expect(errors.size).toBe(0);
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

    const errors = await validateDatasetUrls(datasets, {
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
    expect(errors).toEqual(
      new Map([
        ["one.yaml", ["license unavailable"]],
        ["two.yaml", ["license unavailable"]],
      ]),
    );
  });
});
