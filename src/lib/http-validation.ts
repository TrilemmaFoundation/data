import { lookup } from "node:dns/promises";
import { BlockList, type LookupFunction } from "node:net";
import { Agent } from "undici";

export const VALIDATOR_USER_AGENT =
  "TrilemmaDataCatalogValidator/1.0 (+https://data.trilemma.foundation)";
export const DEFAULT_TIMEOUT_MS = 10_000;
export const MAX_REDIRECTS = 5;

export type ResolvedAddress = { address: string; family: number };
export type ResolveHost = (hostname: string) => Promise<ResolvedAddress[]>;
export type ApprovedAddress = { address: string; family: 4 | 6 };
export type PinnedAgentCache = Map<string, Agent>;

type PinnedFetchOptions = {
  method?: "HEAD" | "GET";
  headers?: Record<string, string>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  resolveHost?: ResolveHost;
  agents?: PinnedAgentCache;
};

export type PinnedFetchResult = {
  status: number | null;
  message: string | null;
  identityError: string | null;
  response: Response | null;
  finalUrl: string;
};

const blockedIpv4 = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedIpv4.addSubnet(network, prefix, "ipv4");
}
const blockedIpv6 = new BlockList();
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blockedIpv6.addSubnet(network, prefix, "ipv6");
}

export const resolveHostWithDns: ResolveHost = (hostname) =>
  lookup(hostname, { all: true, verbatim: true });

export function createPinnedLookup(
  address: string,
  family: 4 | 6,
): LookupFunction {
  return (_hostname, options, callback) =>
    options.all
      ? callback(null, [{ address, family }])
      : callback(null, address, family);
}

export function agentCacheKey(address: string, family: 4 | 6): string {
  return `${family}:${address}`;
}

export function getPinnedAgent(
  agents: PinnedAgentCache,
  address: string,
  family: 4 | 6,
): Agent {
  const key = agentCacheKey(address, family);
  const cached = agents.get(key);
  if (cached) return cached;
  const agent = new Agent({
    connect: { lookup: createPinnedLookup(address, family) },
  });
  agents.set(key, agent);
  return agent;
}

export async function closePinnedAgents(agents: PinnedAgentCache): Promise<void> {
  await Promise.all([...agents.values()].map((agent) => agent.close()));
  agents.clear();
}

export async function resolveSafeTarget(
  target: URL,
  originalHostname: string,
  resolveHost: ResolveHost,
): Promise<{ error: string } | ApprovedAddress> {
  if (target.protocol !== "https:" || target.username || target.password) {
    return {
      error: `${target.toString()} must use HTTPS without embedded credentials`,
    };
  }
  if (target.hostname !== originalHostname) {
    return {
      error: `${target.toString()} redirected to unexpected host ${target.hostname}`,
    };
  }

  const hostname = target.hostname.replace(/^\[|\]$/g, "");
  const addresses = await resolveHost(hostname);
  if (addresses.length === 0) {
    return { error: `${target.toString()} did not resolve to an IP address` };
  }
  const blocked = addresses.find(({ address, family }) =>
    family !== 4 && family !== 6
      ? true
      : family === 4
        ? blockedIpv4.check(address, "ipv4")
        : blockedIpv6.check(address, "ipv6"),
  );
  if (blocked) {
    return {
      error: `${target.toString()} resolved to blocked address ${blocked.address}`,
    };
  }
  const approved = addresses.find(({ family }) => family === 4) ?? addresses[0]!;
  return { address: approved.address, family: approved.family as 4 | 6 };
}

function sameHostError(url: string, target: URL, originalHostname: string): string | null {
  if (target.protocol !== "https:" || target.username || target.password) {
    return `${target.toString()} must use HTTPS without embedded credentials`;
  }
  if (target.hostname !== originalHostname) {
    return `${url} redirected to unexpected host ${target.hostname}`;
  }
  return null;
}

export async function fetchPinnedHttps(
  url: string,
  options: PinnedFetchOptions = {},
): Promise<PinnedFetchResult> {
  const method = options.method ?? "GET";
  const fetchImpl = options.fetchImpl;
  const resolveHost = options.resolveHost ?? resolveHostWithDns;
  const agents = options.agents ?? new Map();
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  let result: PinnedFetchResult;
  try {
    const original = new URL(url);
    let target = original;
    let response: Response;
    let completed: PinnedFetchResult | undefined;
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      let dispatcher: Agent | undefined;
      const pinDns = !fetchImpl || options.resolveHost;
      if (pinDns) {
        const safety = await resolveSafeTarget(
          target,
          original.hostname,
          resolveHost,
        );
        if ("error" in safety) {
          completed = {
            status: null,
            message: null,
            identityError: safety.error,
            response: null,
            finalUrl: target.toString(),
          };
          break;
        }
        if (!fetchImpl) {
          dispatcher = getPinnedAgent(agents, safety.address, safety.family);
        }
      } else {
        const hostError = sameHostError(url, target, original.hostname);
        if (hostError) {
          completed = {
            status: null,
            message: null,
            identityError: hostError,
            response: null,
            finalUrl: target.toString(),
          };
          break;
        }
      }

      const requestInit = {
        method,
        redirect: "manual" as const,
        signal: controller.signal,
        headers: {
          "User-Agent": VALIDATOR_USER_AGENT,
          ...options.headers,
        },
      };

      response = fetchImpl
        ? await fetchImpl(target, requestInit)
        : await fetch(target, {
            ...requestInit,
            dispatcher,
          } as RequestInit & { dispatcher: Agent });

      if (response.status < 300 || response.status >= 400) {
        completed = {
          status: response.status,
          message: null,
          identityError: null,
          response,
          finalUrl: response.url || target.toString(),
        };
        break;
      }

      const location = response.headers.get("location");
      await response.body?.cancel().catch(() => undefined);
      if (!location) {
        completed = {
          status: response.status,
          message: null,
          identityError: `${target.toString()} redirected without a Location header`,
          response: null,
          finalUrl: target.toString(),
        };
        break;
      }
      target = new URL(location, target);
    }
    result = completed ?? {
      status: null,
      message: null,
      identityError: `${url} exceeded ${MAX_REDIRECTS} redirects`,
      response: null,
      finalUrl: url,
    };
  } catch (error) {
    result = {
      status: null,
      message: `${method} ${url}: ${error instanceof Error ? error.message : String(error)}`,
      identityError: null,
      response: null,
      finalUrl: url,
    };
  }
  clearTimeout(timer);
  return result;
}

export async function readBoundedBody(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array | null> {
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
