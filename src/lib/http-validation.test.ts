import { describe, expect, it, vi } from "vitest";
import { Agent } from "undici";
import {
  agentCacheKey,
  closePinnedAgents,
  createPinnedLookup,
  fetchPinnedHttps,
  getPinnedAgent,
  MAX_REDIRECTS,
  readBoundedBody,
  resolveHostWithDns,
} from "./http-validation";

describe("pinned HTTP helpers", () => {
  it("reuses agents by address family", async () => {
    const agents = new Map();
    const first = getPinnedAgent(agents, "93.184.216.34", 4);
    const second = getPinnedAgent(agents, "93.184.216.34", 4);
    expect(first).toBe(second);
    expect(agentCacheKey("93.184.216.34", 4)).toBe("4:93.184.216.34");
    expect(first).toBeInstanceOf(Agent);
    const ipv6 = getPinnedAgent(agents, "2001:db8::1", 6);
    expect(ipv6).toBe(getPinnedAgent(agents, "2001:db8::1", 6));
    expect(ipv6).not.toBe(first);
    expect(agentCacheKey("2001:db8::1", 6)).toBe("6:2001:db8::1");
    await closePinnedAgents(agents);
    expect(agents.size).toBe(0);
  });

  it("resolves numeric hosts through DNS", async () => {
    await expect(resolveHostWithDns("127.0.0.1")).resolves.toEqual([
      { address: "127.0.0.1", family: 4 },
    ]);
  });

  it("creates a pinned lookup for IPv4 and IPv6 addresses", () => {
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

  it("rejects a cross-host redirect when DNS pinning is skipped", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "https://evil.example/x" },
      }),
    );
    await expect(
      fetchPinnedHttps("https://example.com/data", { fetchImpl }),
    ).resolves.toMatchObject({
      identityError: "https://example.com/data redirected to unexpected host evil.example",
      response: null,
    });
  });

  it("rejects an HTTP target when DNS pinning is skipped", async () => {
    const fetchImpl = vi.fn();
    await expect(
      fetchPinnedHttps("http://example.com/data", { fetchImpl }),
    ).resolves.toMatchObject({
      identityError: "http://example.com/data must use HTTPS without embedded credentials",
    });
    expect(fetchImpl).not.toHaveBeenCalled();

    await expect(
      fetchPinnedHttps("https://user:pass@example.com/data", { fetchImpl }),
    ).resolves.toMatchObject({
      identityError:
        "https://user:pass@example.com/data must use HTTPS without embedded credentials",
    });
  });

  it("rejects a redirect without a Location header", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 302 }));
    await expect(
      fetchPinnedHttps("https://example.com/data", { fetchImpl }),
    ).resolves.toMatchObject({
      identityError: "https://example.com/data redirected without a Location header",
    });
  });

  it("rejects too many redirects", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "/next" },
      }),
    );
    const result = await fetchPinnedHttps("https://example.com/data", { fetchImpl });
    expect(result.identityError).toBe(
      `https://example.com/data exceeded ${MAX_REDIRECTS} redirects`,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(MAX_REDIRECTS + 1);
  });

  it("returns an empty body when the response has no stream", async () => {
    const body = await readBoundedBody(new Response(null), 100);
    expect(body).toEqual(new Uint8Array());
    await expect(readBoundedBody(new Response("ok"), 100)).resolves.toEqual(
      new TextEncoder().encode("ok"),
    );
  });

  it("aborts a pending response-body read and cancels the stream", async () => {
    let cancelled = false;
    const response = new Response(new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    }));
    const controller = new AbortController();
    const pending = readBoundedBody(response, 100, controller.signal);
    controller.abort(new Error("body timed out"));
    await expect(pending).rejects.toThrow("body timed out");
    expect(cancelled).toBe(true);
  });

  it("rejects an already-aborted body read", async () => {
    const controller = new AbortController();
    controller.abort("timed out");
    await expect(
      readBoundedBody(new Response("body"), 100, controller.signal),
    ).rejects.toThrow("request aborted");
  });

  it("returns null when a signaled body exceeds the byte limit", async () => {
    const controller = new AbortController();
    await expect(
      readBoundedBody(new Response("abcdefghij"), 4, controller.signal),
    ).resolves.toBeNull();
    await expect(
      readBoundedBody(new Response("ok"), 100, controller.signal),
    ).resolves.toEqual(new TextEncoder().encode("ok"));
  });

  it("uses a caller-supplied abort signal instead of an internal timeout", async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn(
        (_url: string | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(init.signal?.reason instanceof Error
                ? init.signal.reason
                : new Error("aborted"));
            });
          }),
      );
      const controller = new AbortController();
      const pending = fetchPinnedHttps("https://example.com/data", {
        fetchImpl: fetchImpl as typeof fetch,
        signal: controller.signal,
        timeoutMs: 5,
      });
      await vi.advanceTimersByTimeAsync(50);
      controller.abort(new Error("caller aborted"));
      await expect(pending).resolves.toMatchObject({
        message: expect.stringContaining("caller aborted"),
        response: null,
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
