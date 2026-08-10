import type { Dataset } from "./schema";

const URL_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 250;
const USER_AGENT =
  "OpenDatasetKnowledgeGraphValidator/1.0 (+https://data.trilemma.foundation)";

export type UrlCheckResult = {
  ok: boolean;
  messages: string[];
};

type CheckUrlOptions = {
  fetchImpl?: typeof fetch;
  delay?: (milliseconds: number) => Promise<void>;
};

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
      return { status: response.status, message: null };
    } catch (error) {
      return {
        status: null,
        message: `${method} ${url}: ${error instanceof Error ? error.message : String(error)}`,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  const head = await attempt("HEAD");
  if (isReachable(head.status)) return { ok: true, messages: [] };

  let get = await attempt("GET");
  if (isReachable(get.status)) return { ok: true, messages: [] };

  if (isTransient(get.status)) {
    await delay(RETRY_DELAY_MS);
    get = await attempt("GET");
    if (isReachable(get.status)) return { ok: true, messages: [] };
  }

  const message =
    get.status === null
      ? get.message ?? head.message ?? `Unable to reach ${url}`
      : `${url} returned HTTP ${get.status}`;
  return { ok: false, messages: [message] };
}

export async function validateDatasetUrls(
  datasets: Dataset[],
  options: {
    concurrency?: number;
    checker?: (url: string) => Promise<UrlCheckResult>;
  } = {},
): Promise<Map<string, string[]>> {
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
  for (const [url, result] of results) {
    if (result.ok) continue;
    for (const file of owners.get(url) ?? []) {
      errorsByFile.set(file, [
        ...(errorsByFile.get(file) ?? []),
        ...result.messages,
      ]);
    }
  }
  return errorsByFile;
}
