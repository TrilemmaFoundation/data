import { lookup } from "node:dns/promises";
import { BlockList, type LookupFunction } from "node:net";
import { Agent } from "undici";

export const VALIDATOR_USER_AGENT =
  "TrilemmaDataCatalogValidator/1.0 (+https://data.trilemma.foundation)";
const DEFAULT_TIMEOUT_MS = 10_000;
export const MAX_REDIRECTS = 5;

type ResolvedAddress = { address: string; family: number };
export type ResolveHost = (hostname: string) => Promise<ResolvedAddress[]>;
type ApprovedAddress = { address: string; family: 4 | 6 };
export type PinnedAgentCache = Map<string, Agent>;

type PinnedFetchOptions = {
  method?: "HEAD" | "GET";
  headers?: Record<string, string>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  resolveHost?: ResolveHost;
  agents?: PinnedAgentCache;
};

type PinnedFetchResult = {
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
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blockedIpv6.addSubnet(network, prefix, "ipv6");
}

function canonicalIpv4(address: string): string | null {
  const parts = address.split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    if (value > 255) return null;
    octets.push(value);
  }
  return octets.join(".");
}

function parseIpv6Groups(part: string): number[] | null {
  if (!part) return [];
  const groups = part.split(":");
  const values: number[] = [];
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
    values.push(Number.parseInt(group, 16));
  }
  return values;
}

function expandIpv6(address: string, expectedGroups: number): number[] | null {
  const parts = address.split("::");
  if (parts.length > 2) return null;
  if (parts.length === 1) {
    const values = parseIpv6Groups(parts[0]!);
    return values?.length === expectedGroups ? values : null;
  }
  const left = parseIpv6Groups(parts[0]!);
  const right = parseIpv6Groups(parts[1]!);
  if (!left || !right) return null;
  const missing = expectedGroups - left.length - right.length;
  if (missing < 0) return null;
  return [...left, ...Array<number>(missing).fill(0), ...right];
}

function parseIpv6(address: string): number[] | null {
  let value = address.toLowerCase();
  if (value.startsWith("[") && value.endsWith("]")) {
    value = value.slice(1, -1);
  }

  let ipv4Groups: number[] | null = null;
  const ipv4Tail = /^(.*):(\d{1,3}(?:\.\d{1,3}){3})$/.exec(value);
  if (ipv4Tail) {
    const ipv4 = canonicalIpv4(ipv4Tail[2]!);
    if (!ipv4) return null;
    const octets = ipv4.split(".").map(Number);
    ipv4Groups = [(octets[0]! << 8) | octets[1]!, (octets[2]! << 8) | octets[3]!];
    value = ipv4Tail[1]!.endsWith(":") ? `${ipv4Tail[1]}:` : ipv4Tail[1]!;
  }
  if (value.includes(".")) return null;

  const groups = expandIpv6(value, ipv4Groups ? 6 : 8);
  if (!groups) return null;
  return ipv4Groups ? [...groups, ...ipv4Groups] : groups;
}

function ipv4FromGroups(groups: number[]): string {
  return `${groups[6]! >> 8}.${groups[6]! & 255}.${groups[7]! >> 8}.${groups[7]! & 255}`;
}

function ipv4FromEmbeddedAddress(address: string): string | null {
  const groups = parseIpv6(address);
  if (!groups) return null;
  const prefix = groups.slice(0, 6);
  const mapped =
    prefix[0] === 0 &&
    prefix[1] === 0 &&
    prefix[2] === 0 &&
    prefix[3] === 0 &&
    prefix[4] === 0 &&
    prefix[5] === 0xffff;
  const nat64 =
    prefix[0] === 0x64 &&
    prefix[1] === 0xff9b &&
    prefix[2] === 0 &&
    prefix[3] === 0 &&
    prefix[4] === 0 &&
    prefix[5] === 0;
  const compatible = prefix.every((group) => group === 0);
  return mapped || nat64 || compatible ? ipv4FromGroups(groups) : null;
}

function isBlockedResolvedAddress(address: string, family: number): boolean {
  if (family !== 4 && family !== 6) return true;
  const ipv4 = canonicalIpv4(address) ?? ipv4FromEmbeddedAddress(address);
  if (ipv4) return blockedIpv4.check(ipv4, "ipv4");
  if (family === 6) return blockedIpv6.check(address, "ipv6");
  return true;
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

async function resolveSafeTarget(
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
    isBlockedResolvedAddress(address, family),
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
