import type { Dataset } from "./schema";
import {
  closePinnedAgents,
  fetchPinnedHttps,
  readBoundedBody,
  resolveHostWithDns,
  type PinnedAgentCache,
  type ResolveHost,
} from "./http-validation";
import { mapPool } from "./async-pool";

const MAX_PAGE_BYTES = 1_000_000;
export const URL_CHECK_TIMEOUT_MS = 10_000;
export const URL_CHECK_CONCURRENCY = 12;
export const URL_RETRY_DELAYS_MS = [250] as const;

type UrlCheckResult = {
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
  agents?: PinnedAgentCache;
  timeoutMs?: number;
};

export const EXCEPTION_WARNING_DAYS = 14;
const DAY_MS = 86_400_000;

const STATUS_EXCEPTIONS = new Map([
  [
    "https://kalshi.com/developer-agreement",
    {
      statuses: [429],
      reason:
        "Kalshi rate-limits automated validation from GitHub Actions; reconfirmed 2026-08-13",
      expires: "2026-11-11",
    },
  ],
  [
    "https://www.nhtsa.gov/nhtsa-datasets-and-apis",
    {
      statuses: [403],
      reason:
        "NHTSA blocks automated validation from some regions; reconfirmed 2026-08-13",
      expires: "2026-11-11",
    },
  ],
  [
    "https://www.nhtsa.gov/about-nhtsa/terms-use",
    {
      statuses: [403],
      reason:
        "NHTSA blocks automated validation from some regions; reconfirmed 2026-08-13",
      expires: "2026-11-11",
    },
  ],
  [
    "https://www.noaa.gov/disclaimer",
    {
      statuses: [403],
      reason:
        "NOAA blocks automated validation from some regions; reconfirmed 2026-08-13",
      expires: "2026-11-11",
    },
  ],
  [
    "https://www.transit.dot.gov/ntd/monthly-ridership",
    {
      statuses: [403],
      reason:
        "FTA blocks automated validation from some regions; reconfirmed 2026-08-13",
      expires: "2026-11-13",
    },
  ],
  [
    "https://www.gbif.org/terms",
    {
      statuses: [403],
      reason:
        "GBIF blocks automated validation from some regions; reconfirmed 2026-08-13",
      expires: "2026-11-13",
    },
  ],
  [
    "https://www.imf.org/en/about/copyright-and-terms",
    {
      statuses: [403],
      reason:
        "IMF blocks automated validation from some regions; reconfirmed 2026-08-13",
      expires: "2026-11-13",
    },
  ],
  [
    "https://www.earthdata.nasa.gov/engage/open-data-services-software/data-use-policy",
    {
      statuses: [403],
      reason:
        "NASA Earthdata blocks automated validation from some regions; reconfirmed 2026-08-14",
      expires: "2026-11-12",
    },
  ],
  [
    "https://www.earthdata.nasa.gov/engage/open-data-services-and-software/data-and-information-policy",
    {
      statuses: [403],
      reason:
        "NASA Earthdata blocks automated validation from some regions; reconfirmed 2026-08-14",
      expires: "2026-11-12",
    },
  ],
  [
    "https://www.unhcr.org/what-we-do/data-and-publications/data-and-statistics/terms-use-datasets",
    {
      statuses: [403],
      reason:
        "UNHCR blocks automated validation from some regions; reconfirmed 2026-08-14",
      expires: "2026-11-12",
    },
  ],
  [
    "https://collegescorecard.ed.gov/data/api/",
    {
      statuses: [403],
      reason:
        "College Scorecard blocks automated validation from some regions; reconfirmed 2026-08-14",
      expires: "2026-11-12",
    },
  ],
  [
    "https://www.fcc.gov/BroadbandData",
    {
      statuses: [403],
      reason:
        "FCC blocks automated validation from some regions; reconfirmed 2026-08-17",
      expires: "2026-11-15",
    },
  ],
  [
    "https://volcano.si.edu/",
    {
      statuses: [403],
      reason:
        "Smithsonian GVP blocks automated validation from some regions; reconfirmed 2026-08-18",
      expires: "2026-11-16",
    },
  ],
  [
    "https://volcano.si.edu/gvp_webservices.cfm",
    {
      statuses: [403],
      reason:
        "Smithsonian GVP blocks automated validation from some regions; reconfirmed 2026-08-18",
      expires: "2026-11-16",
    },
  ],
  [
    "https://lda.gov/api/",
    {
      statuses: [403],
      reason:
        "Senate LDA blocks automated validation from some regions; reconfirmed 2026-08-18",
      expires: "2026-11-16",
    },
  ],
  [
    "https://main.un.org/securitycouncil/en/content/un-sc-consolidated-list",
    {
      statuses: [403],
      reason:
        "UN Security Council pages block automated validation from some regions; reconfirmed 2026-08-18",
      expires: "2026-11-16",
    },
  ],
]);

function isReachable(status: number | null): boolean {
  return status !== null && status >= 200 && status < 400;
}

function isTransient(status: number | null): boolean {
  return status === null || status === 408 || status === 429 || (status >= 500 && status < 600);
}

function daysUntil(expires: string, todayIso: string): number {
  return Math.floor(
    (Date.parse(`${expires}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) /
      DAY_MS,
  );
}

export function listUrlExceptions(): Array<{
  url: string;
  expires: string;
  reason: string;
}> {
  return [...STATUS_EXCEPTIONS.entries()].map(([url, exception]) => ({
    url,
    expires: exception.expires,
    reason: exception.reason,
  }));
}

export function exceptionExpiryWarnings(today = new Date()): string[] {
  const todayIso = today.toISOString().slice(0, 10);
  const warnings: string[] = [];
  for (const [url, exception] of STATUS_EXCEPTIONS) {
    if (exception.expires < todayIso) continue;
    const days = daysUntil(exception.expires, todayIso);
    if (days <= EXCEPTION_WARNING_DAYS) {
      warnings.push(
        `${url} exception expires on ${exception.expires} (${days} day(s)); reconfirm or remove`,
      );
    }
  }
  return warnings;
}

export async function checkUrl(
  url: string,
  options: CheckUrlOptions = {},
): Promise<UrlCheckResult> {
  const fetchImpl = options.fetchImpl;
  const resolveHost = options.resolveHost ?? resolveHostWithDns;
  const delay = options.delay ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const today = (options.today ?? new Date()).toISOString().slice(0, 10);
  const ownsAgents = !options.agents;
  const agents = options.agents ?? new Map();

  async function attempt(method: "HEAD" | "GET") {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? URL_CHECK_TIMEOUT_MS,
    );
    const finish = <T>(value: T): T => {
      clearTimeout(timer);
      return value;
    };
    try {
      const result = await fetchPinnedHttps(url, {
        method,
        fetchImpl,
        resolveHost,
        agents,
        signal: controller.signal,
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "identity",
        },
      });

      if (result.identityError || !result.response) {
        return finish({
          status: result.status,
          message: result.message,
          identityError: result.identityError,
        });
      }

      const response = result.response;
      let identityError: string | null = null;
      if (
        method === "GET" &&
        options.expectedMarker &&
        isReachable(response.status)
      ) {
        const finalUrl = result.finalUrl;
        if (new URL(finalUrl).hostname !== new URL(url).hostname) {
          identityError = `${url} redirected to unexpected host ${new URL(finalUrl).hostname}`;
          await response.body?.cancel().catch(() => undefined);
        } else {
          const body = await readBoundedBody(
            response,
            MAX_PAGE_BYTES,
            controller.signal,
          );
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
      return finish({ status: response.status, message: null, identityError });
    } catch (error) {
      return finish({
        status: null,
        message: `${method} ${url}: ${error instanceof Error ? error.message : String(error)}`,
        identityError: null,
      });
    }
  }

  try {
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

    for (const retryDelay of URL_RETRY_DELAYS_MS) {
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
  } finally {
    if (ownsAgents) await closePinnedAgents(agents);
  }
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
  const agents: PinnedAgentCache = new Map();
  const checker = options.checker ?? ((url, expectedMarker) =>
    checkUrl(url, { expectedMarker, resolveHost: options.resolveHost, agents }));
  try {
    const results = new Map(
      await mapPool(
        jobs,
        options.concurrency ?? URL_CHECK_CONCURRENCY,
        async ([key, job]) =>
          [key, await checker(job.url, job.expectedMarker)] as const,
      ),
    );

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
  } finally {
    await closePinnedAgents(agents);
  }
}
