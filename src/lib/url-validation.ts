import type { Dataset } from "./schema";

const URL_TIMEOUT_MS = 10_000;
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
  today?: Date;
};

const STATUS_EXCEPTIONS = new Map([
  [
    "https://www.usgs.gov/data-management/data-licensing",
    {
      statuses: [403],
      reason: "USGS CloudFront blocks automated validation from some regions",
      expires: "2026-11-08",
    },
  ],
]);

function isReachable(status: number | null): boolean {
  return status !== null && status >= 200 && status < 400;
}

function isTransient(status: number | null): boolean {
  return status === null || status === 408 || status === 429 || (status >= 500 && status < 600);
}

export async function checkUrl(
  url: string,
  options: CheckUrlOptions = {},
): Promise<UrlCheckResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const delay = options.delay ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const today = (options.today ?? new Date()).toISOString().slice(0, 10);

  async function attempt(method: "HEAD" | "GET") {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), URL_TIMEOUT_MS);
    try {
      const response = await fetchImpl(url, {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "identity",
        },
      });
      await response.body?.cancel().catch(() => undefined);
      clearTimeout(timer);
      return { status: response.status, message: null };
    } catch (error) {
      clearTimeout(timer);
      return {
        status: null,
        message: `${method} ${url}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  const head = await attempt("HEAD");
  if (isReachable(head.status)) return { ok: true, messages: [] };

  let get = await attempt("GET");
  if (isReachable(get.status)) return { ok: true, messages: [] };

  for (const retryDelay of RETRY_DELAYS_MS) {
    if (!isTransient(get.status)) break;
    await delay(retryDelay);
    get = await attempt("GET");
    if (isReachable(get.status)) return { ok: true, messages: [] };
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
    checker?: (url: string) => Promise<UrlCheckResult>;
  } = {},
): Promise<DatasetUrlValidationResult> {
  const owners = new Map<string, Set<string>>();
  for (const dataset of datasets) {
    for (const url of [dataset.url, dataset.license_url]) {
      const files = owners.get(url) ?? new Set<string>();
      files.add(`${dataset.id}.yaml`);
      owners.set(url, files);
    }
  }

  const urls = [...owners.keys()];
  const results = new Map<string, UrlCheckResult>();
  const checker = options.checker ?? checkUrl;
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 3, urls.length || 1));
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < urls.length) {
      const url = urls[nextIndex++];
      results.set(url, await checker(url));
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const errorsByFile = new Map<string, string[]>();
  const warningsByFile = new Map<string, string[]>();
  for (const [url, result] of results) {
    for (const file of owners.get(url)!) {
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
