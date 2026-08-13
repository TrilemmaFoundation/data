import { lookup } from "node:dns/promises";
import { BlockList, type LookupFunction } from "node:net";
import { Agent } from "undici";
import type { Dataset } from "./schema";
import { readBoundedBody } from "./http-validation";

const URL_TIMEOUT_MS = 10_000;
const MAX_PAGE_BYTES = 1_000_000;
const MAX_REDIRECTS = 5;
const RETRY_DELAYS_MS = [250, 750];
const USER_AGENT =
  "TrilemmaDataCatalogValidator/1.0 (+https://data.trilemma.foundation)";

export type UrlCheckResult = {
  ok: boolean;
  messages: string[];
  warnings?: string[];
};

type DatasetUrlValidationResult = {
  errors: Map<string, string[]>;
  warnings: Map<string, string[]>;
};

type CheckUrlOptions = {
  fetchImpl?: typeof fetch;
  delay?: (milliseconds: number) => Promise<void>;
  resolveHost?: ResolveHost;
  today?: Date;
  expectedMarker?: string;
};

type ResolvedAddress = { address: string; family: number };
type ResolveHost = (hostname: string) => Promise<ResolvedAddress[]>;
type ApprovedAddress = { address: string; family: 4 | 6 };

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

const resolveHostWithDns: ResolveHost = (hostname) =>
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

const STATUS_EXCEPTIONS = new Map([
  [
    "https://www.earthdata.nasa.gov/engage/open-data-services-software/data-use-policy",
    {
      statuses: [403],
      reason: "NASA Earthdata blocks automated validation from GitHub Actions",
      expires: "2026-11-08",
    },
  ],
  [
    "https://www.usgs.gov/data-management/data-licensing",
    {
      statuses: [403],
      reason: "USGS CloudFront blocks automated validation from some regions",
      expires: "2026-11-08",
    },
  ],
  [
    "https://kalshi.com/developer-agreement",
    {
      statuses: [429],
      reason: "Kalshi rate-limits automated validation from GitHub Actions",
      expires: "2026-11-09",
    },
  ],
  [
    "https://www.nhtsa.gov/nhtsa-datasets-and-apis",
    {
      statuses: [403],
      reason: "NHTSA blocks automated validation from some regions",
      expires: "2026-11-09",
    },
  ],
  [
    "https://www.nhtsa.gov/about-nhtsa/terms-use",
    {
      statuses: [403],
      reason: "NHTSA blocks automated validation from some regions",
      expires: "2026-11-09",
    },
  ],
  [
    "https://www.noaa.gov/disclaimer",
    {
      statuses: [403],
      reason: "NOAA blocks automated validation from some regions",
      expires: "2026-11-09",
    },
  ],
  [
    "https://www.transit.dot.gov/ntd/monthly-ridership",
    {
      statuses: [403],
      reason: "FTA blocks automated validation from some regions",
      expires: "2026-11-13",
    },
  ],
  [
    "https://www.gbif.org/terms",
    {
      statuses: [403],
      reason: "GBIF blocks automated validation from some regions",
      expires: "2026-11-13",
    },
  ],
  [
    "https://www.imf.org/en/about/copyright-and-terms",
    {
      statuses: [403],
      reason: "IMF blocks automated validation from some regions",
      expires: "2026-11-13",
    },
  ],
  [
    "https://www.unhcr.org/what-we-do/data-and-publications/data-and-statistics/terms-use-datasets",
    {
      statuses: [403],
      reason: "UNHCR blocks automated validation from some regions",
      expires: "2026-11-13",
    },
  ],
]);

function isReachable(status: number | null): boolean {
  return status !== null && status >= 200 && status < 400;
}

function isTransient(status: number | null): boolean {
  return status === null || status === 408 || status === 429 || (status >= 500 && status < 600);
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

export async function checkUrl(
  url: string,
  options: CheckUrlOptions = {},
): Promise<UrlCheckResult> {
  const fetchImpl = options.fetchImpl;
  const resolveHost = options.resolveHost ?? resolveHostWithDns;
  const delay = options.delay ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const today = (options.today ?? new Date()).toISOString().slice(0, 10);

  async function attempt(method: "HEAD" | "GET") {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), URL_TIMEOUT_MS);
    let dispatcher: Agent | undefined;
    const closeDispatcher = async () => {
      await dispatcher?.close();
      dispatcher = undefined;
    };
    try {
      const original = new URL(url);
      let target = original;
      let response: Response;
      for (let redirects = 0; ; redirects += 1) {
        const safety = await resolveSafeTarget(
          target,
          original.hostname,
          resolveHost,
        );
        if ("error" in safety) {
          clearTimeout(timer);
          return { status: null, message: null, identityError: safety.error };
        }

        const requestInit = {
          method,
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "User-Agent": USER_AGENT,
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "identity",
          },
        } satisfies RequestInit;
        if (fetchImpl) {
          response = await fetchImpl(target, requestInit);
        } else {
          dispatcher = new Agent({
            connect: {
              lookup: createPinnedLookup(safety.address, safety.family),
            },
          });
          response = await fetch(target, {
            ...requestInit,
            dispatcher,
          } as RequestInit & { dispatcher: Agent });
        }
        if (response.status < 300 || response.status >= 400) break;

        const location = response.headers.get("location");
        await response.body?.cancel().catch(() => undefined);
        await closeDispatcher();
        if (!location) {
          clearTimeout(timer);
          return {
            status: response.status,
            message: null,
            identityError: `${target.toString()} redirected without a Location header`,
          };
        }
        if (redirects >= MAX_REDIRECTS) {
          clearTimeout(timer);
          return {
            status: response.status,
            message: null,
            identityError: `${url} exceeded ${MAX_REDIRECTS} redirects`,
          };
        }
        target = new URL(location, target);
      }

      let identityError: string | null = null;
      if (
        method === "GET" &&
        options.expectedMarker &&
        isReachable(response.status)
      ) {
        const finalUrl = response.url || target.toString();
        if (new URL(finalUrl).hostname !== new URL(url).hostname) {
          identityError = `${url} redirected to unexpected host ${new URL(finalUrl).hostname}`;
          await response.body?.cancel().catch(() => undefined);
        } else {
          const body = await readBoundedBody(response, MAX_PAGE_BYTES);
          if (!body) {
            identityError = `${url} response exceeds ${MAX_PAGE_BYTES} bytes`;
          } else if (
            !new TextDecoder()
              .decode(body)
              .toLocaleLowerCase("en-US")
              .includes(options.expectedMarker.toLocaleLowerCase("en-US"))
          ) {
            identityError = `${url} did not contain expected page marker "${options.expectedMarker}"`;
          }
        }
      } else {
        await response.body?.cancel().catch(() => undefined);
      }
      await closeDispatcher();
      clearTimeout(timer);
      return { status: response.status, message: null, identityError };
    } catch (error) {
      await closeDispatcher().catch(() => undefined);
      clearTimeout(timer);
      return {
        status: null,
        message: `${method} ${url}: ${error instanceof Error ? error.message : String(error)}`,
        identityError: null,
      };
    }
  }

  if (!options.expectedMarker) {
    const head = await attempt("HEAD");
    if (isReachable(head.status)) return { ok: true, messages: [] };
    if (head.identityError) {
      return { ok: false, messages: [head.identityError] };
    }
  }

  let get = await attempt("GET");
  if (isReachable(get.status) && !get.identityError) {
    return { ok: true, messages: [] };
  }
  if (get.identityError) {
    return { ok: false, messages: [get.identityError] };
  }

  for (const retryDelay of RETRY_DELAYS_MS) {
    if (!isTransient(get.status)) break;
    await delay(retryDelay);
    get = await attempt("GET");
    if (isReachable(get.status) && !get.identityError) {
      return { ok: true, messages: [] };
    }
    if (get.identityError) {
      return { ok: false, messages: [get.identityError] };
    }
  }

  const exception = STATUS_EXCEPTIONS.get(url);
  if (
    get.status !== null &&
    exception?.statuses.includes(get.status) &&
    exception.expires >= today
  ) {
    return {
      ok: true,
      messages: [],
      warnings: [
        `${url} returned HTTP ${get.status}; allowed until ${exception.expires}: ${exception.reason}`,
      ],
    };
  }

  const message = get.status === null
    ? get.message!
    : `${url} returned HTTP ${get.status}`;
  return { ok: false, messages: [message] };
}

export async function validateDatasetUrls(
  datasets: Dataset[],
  options: {
    concurrency?: number;
    checker?: (url: string, expectedMarker: string) => Promise<UrlCheckResult>;
    resolveHost?: ResolveHost;
  } = {},
): Promise<DatasetUrlValidationResult> {
  const owners = new Map<
    string,
    { url: string; expectedMarker: string; files: Set<string> }
  >();
  for (const dataset of datasets) {
    const pages = [
      [dataset.url, dataset.url_checks.source_marker],
      [dataset.license_url, dataset.url_checks.license_marker],
    ] as const;
    for (const [url, expectedMarker] of pages) {
      const key = JSON.stringify([url, expectedMarker]);
      const job = owners.get(key) ?? { url, expectedMarker, files: new Set<string>() };
      job.files.add(`${dataset.id}.yaml`);
      owners.set(key, job);
    }
  }

  const jobs = [...owners.entries()];
  const results = new Map<string, UrlCheckResult>();
  const checker = options.checker ?? ((url, expectedMarker) =>
    checkUrl(url, { expectedMarker, resolveHost: options.resolveHost }));
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 3, jobs.length || 1));
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < jobs.length) {
      const [key, job] = jobs[nextIndex++];
      results.set(key, await checker(job.url, job.expectedMarker));
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const errorsByFile = new Map<string, string[]>();
  const warningsByFile = new Map<string, string[]>();
  for (const [key, result] of results) {
    for (const file of owners.get(key)!.files) {
      if (!result.ok) {
        errorsByFile.set(file, [
          ...(errorsByFile.get(file) ?? []),
          ...result.messages,
        ]);
      }
      if (result.warnings?.length) {
        warningsByFile.set(file, [
          ...(warningsByFile.get(file) ?? []),
          ...result.warnings,
        ]);
      }
    }
  }
  return { errors: errorsByFile, warnings: warningsByFile };
}
