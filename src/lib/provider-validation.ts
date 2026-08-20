import {
  closePinnedAgents,
  fetchPinnedHttps,
  readBoundedBody,
  VALIDATOR_USER_AGENT,
  type ResolveHost,
} from "./http-validation";
import { mapPool } from "./async-pool";
import {
  getProviderContract,
  hasProviderContract,
  mediaTypeOf,
} from "./provider-contracts";
import type { Dataset } from "./schema";

const MAX_RESPONSE_BYTES = 2_000_000;
const TIMEOUT_MS = 10_000;

type ProviderValidationOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  concurrency?: number;
  resolveHost?: ResolveHost;
};

export function providerRequestFailure(url: string, message: string | null): string {
  const prefix = `GET ${url}: `;
  if (!message) return "provider contract request failed: unknown";
  if (message.startsWith(prefix)) {
    return `provider contract request failed: ${message.slice(prefix.length)}`;
  }
  return `provider contract request failed: ${message}`;
}

export async function checkProviderContract(
  datasetId: string,
  options: ProviderValidationOptions = {},
): Promise<string[]> {
  const contract = getProviderContract(datasetId);
  if (!contract) {
    return [`no provider contract is defined for ${datasetId}`];
  }

  const agents = new Map();
  const { url, contentTypes, range, validate } = contract;

  async function request() {
    const result = await fetchPinnedHttps(url, {
      fetchImpl: options.fetchImpl,
      resolveHost: options.resolveHost,
      timeoutMs: options.timeoutMs ?? TIMEOUT_MS,
      agents,
      headers: {
        Accept: contentTypes.join(", "),
        "User-Agent": VALIDATOR_USER_AGENT,
        ...(range ? { Range: range } : {}),
      },
    });
    if (result.identityError) return [result.identityError];
    if (!result.response) {
      return [providerRequestFailure(url, result.message)];
    }

    const response = result.response;
    if (!response.ok) return [`provider contract returned HTTP ${response.status}`];

    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_RESPONSE_BYTES) {
      await response.body?.cancel().catch(() => undefined);
      return [`provider response exceeds ${MAX_RESPONSE_BYTES} bytes`];
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const mediaType = mediaTypeOf(contentType);
    if (!contentTypes.some((type) => mediaType === mediaTypeOf(type))) {
      await response.body?.cancel().catch(() => undefined);
      return [`unexpected provider content type: ${contentType || "missing"}`];
    }

    const body = await readBoundedBody(response, MAX_RESPONSE_BYTES);
    if (!body) {
      return [`provider response exceeds ${MAX_RESPONSE_BYTES} bytes`];
    }

    const validationError = validate(body);
    return validationError ? [validationError] : [];
  }

  let errors: string[];
  try {
    errors = await request();
  } catch (error) {
    errors = [
      `provider contract request failed: ${error instanceof Error ? error.message : String(error)}`,
    ];
  }
  await closePinnedAgents(agents);
  return errors;
}

export async function validateProviderContracts(
  datasets: Dataset[],
  options: ProviderValidationOptions = {},
): Promise<Map<string, string[]>> {
  const jobs = datasets.filter((dataset) => hasProviderContract(dataset.id));
  const results = await mapPool(jobs, options.concurrency ?? 3, async (dataset) => [
    `${dataset.id}.yaml`,
    await checkProviderContract(dataset.id, options),
  ] as const);
  return new Map(results.filter(([, errors]) => errors.length > 0));
}
