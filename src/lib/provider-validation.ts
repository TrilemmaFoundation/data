import { z } from "zod";
import { readBoundedBody } from "./http-validation";
import type { Dataset } from "./schema";

const MAX_RESPONSE_BYTES = 1_000_000;
const TIMEOUT_MS = 10_000;

const contracts = {
  "nasa-firms": {
    url: "https://firms.modaps.eosdis.nasa.gov/content/notebooks/sample_viirs_snpp_071223.csv",
    range: "bytes=0-65535",
    contentTypes: ["text/csv", "text/plain", "application/octet-stream"],
    validate(body: Uint8Array) {
      const header = new TextDecoder().decode(body).split(/\r?\n/, 1).join().split(",");
      return ["latitude", "longitude", "acq_date", "frp"].every((field) =>
        header.includes(field),
      )
        ? null
        : "CSV is missing latitude, longitude, acq_date, or frp";
    },
  },
  "natural-earth": {
    url: "https://naturalearth.s3.amazonaws.com/110m_cultural/ne_110m_admin_0_countries.zip",
    range: "bytes=0-3",
    contentTypes: ["application/zip", "application/octet-stream"],
    validate(body: Uint8Array) {
      return body[0] === 0x50 && body[1] === 0x4b
        ? null
        : "download is not a ZIP archive";
    },
  },
  "polymarket-markets": {
    url: "https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=1",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.array(
        z.object({
          question: z.string(),
          volume: z.union([z.string(), z.number()]),
          liquidity: z.union([z.string(), z.number()]),
        }),
      ).min(1),
    ),
  },
  "usgs-earthquakes": {
    url: "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=1&orderby=time",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        features: z.array(
          z.object({
            properties: z.object({
              mag: z.number().nullable(),
              place: z.string().nullable(),
              time: z.number(),
            }),
          }),
        ).min(1),
      }),
    ),
  },
  "world-development-indicators": {
    url: "https://api.worldbank.org/v2/country/all/indicator/NY.GDP.PCAP.CD?format=json&per_page=1",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.tuple([
        z.object({ page: z.number(), pages: z.number(), total: z.number() }),
        z.array(
          z.object({
            countryiso3code: z.string(),
            date: z.string(),
            value: z.number().nullable(),
          }),
        ).min(1),
      ]),
    ),
  },
} satisfies Record<
  string,
  {
    url: string;
    range?: string;
    contentTypes: string[];
    validate(body: Uint8Array): string | null;
  }
>;

type ProviderValidationOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

function jsonValidator(schema: z.ZodType) {
  return (body: Uint8Array): string | null => {
    let value: unknown;
    try {
      value = JSON.parse(new TextDecoder().decode(body));
    } catch {
      return "response is not valid JSON";
    }
    const result = schema.safeParse(value);
    return result.success
      ? null
      : `response contract mismatch: ${z.prettifyError(result.error)}`;
  };
}

export async function checkProviderContract(
  datasetId: string,
  options: ProviderValidationOptions = {},
): Promise<string[]> {
  const contract = contracts[datasetId as keyof typeof contracts];
  if (!contract) return [`no provider contract is defined for ${datasetId}`];

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? TIMEOUT_MS,
  );

  async function request() {
    const response = await (options.fetchImpl ?? fetch)(contract.url, {
      headers: {
        Accept: contract.contentTypes.join(", "),
        "User-Agent":
          "TrilemmaDataCatalogValidator/1.0 (+https://data.trilemma.foundation)",
        ...("range" in contract ? { Range: contract.range } : {}),
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) return [`provider contract returned HTTP ${response.status}`];

    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_RESPONSE_BYTES) {
      return [`provider response exceeds ${MAX_RESPONSE_BYTES} bytes`];
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contract.contentTypes.some((type) => contentType.startsWith(type))) {
      return [`unexpected provider content type: ${contentType || "missing"}`];
    }

    const body = await readBoundedBody(response, MAX_RESPONSE_BYTES);
    if (!body) {
      return [`provider response exceeds ${MAX_RESPONSE_BYTES} bytes`];
    }

    const validationError = contract.validate(body);
    return validationError ? [validationError] : [];
  }

  try {
    const result = await request();
    clearTimeout(timer);
    return result;
  } catch (error) {
    clearTimeout(timer);
    return [
      `provider contract request failed: ${error instanceof Error ? error.message : String(error)}`,
    ];
  }
}

export async function validateProviderContracts(
  datasets: Dataset[],
  options: ProviderValidationOptions = {},
): Promise<Map<string, string[]>> {
  const results = await Promise.all(
    datasets.map(async (dataset) => [
      `${dataset.id}.yaml`,
      await checkProviderContract(dataset.id, options),
    ] as const),
  );
  return new Map(results.filter(([, errors]) => errors.length > 0));
}
