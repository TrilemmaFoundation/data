import { loadDatasets, getDatasetsDir } from "../src/lib/datasets";
import type { Dataset } from "../src/lib/schema";

const USER_AGENT =
  "OpenDatasetKnowledgeGraphValidator/1.0 (+https://data.trilemma.foundation)";
const URL_TIMEOUT_MS = 10_000;

type CheckResult = {
  ok: boolean;
  messages: string[];
};

function isOfflineMode(argv: string[]): boolean {
  return argv.includes("--offline");
}

function isFutureDate(isoDate: string): boolean {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  return isoDate > todayIso;
}

async function checkUrl(url: string): Promise<CheckResult> {
  const messages: string[] = [];

  async function attempt(method: "HEAD" | "GET"): Promise<number | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), URL_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
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
      return response.status;
    } catch (error) {
      messages.push(
        `${method} ${url}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  let status = await attempt("HEAD");
  // Many hosts reject or mis-handle HEAD; always fall back to GET unless HEAD
  // already proved the URL is reachable.
  if (status === null || status < 200 || status >= 400) {
    status = await attempt("GET");
  }

  if (status === null) {
    return { ok: false, messages };
  }

  if (status >= 200 && status < 400) {
    return { ok: true, messages: [] };
  }

  return {
    ok: false,
    messages: [`${url} returned HTTP ${status}`],
  };
}

async function validateUrls(dataset: Dataset): Promise<string[]> {
  const messages: string[] = [];
  const urlResult = await checkUrl(dataset.url);
  const licenseResult = await checkUrl(dataset.license_url);
  messages.push(...urlResult.messages, ...licenseResult.messages);
  return messages;
}

async function main() {
  const offline = isOfflineMode(process.argv.slice(2));
  const dir = getDatasetsDir();
  const { datasets, errors } = loadDatasets(dir);

  const allErrors: { file: string; messages: string[] }[] = [...errors];

  for (const dataset of datasets) {
    const file = `${dataset.id}.yaml`;
    const messages: string[] = [];

    if (isFutureDate(dataset.last_verified)) {
      messages.push(
        `last_verified ${dataset.last_verified} is in the future`,
      );
    }

    if (!offline) {
      const urlMessages = await validateUrls(dataset);
      messages.push(...urlMessages);
    }

    if (messages.length > 0) {
      allErrors.push({ file, messages });
    }
  }

  if (allErrors.length === 0) {
    console.log(
      `✓ Validated ${datasets.length} dataset(s)${offline ? " (offline)" : ""}.`,
    );
    process.exit(0);
  }

  console.error(`✗ Dataset validation failed:\n`);
  for (const error of allErrors) {
    console.error(`${error.file}`);
    for (const message of error.messages) {
      console.error(`  - ${message}`);
    }
    console.error("");
  }
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
