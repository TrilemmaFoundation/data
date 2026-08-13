import { z } from "zod";
import { readBoundedBody } from "./http-validation";
import type { Dataset } from "./schema";

const MAX_RESPONSE_BYTES = 2_000_000;
const TIMEOUT_MS = 10_000;

const contracts = {
  "clinicaltrials-studies": {
    url: "https://clinicaltrials.gov/api/v2/studies?query.cond=asthma&format=json&pageSize=1",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        studies: z.array(z.object({
          protocolSection: z.object({
            identificationModule: z.object({
              nctId: z.string(),
              briefTitle: z.string(),
            }),
          }),
        })).min(1),
      }),
    ),
  },
  "cms-care-compare-hospitals": {
    url: "https://data.cms.gov/provider-data/api/1/datastore/query/xubh-q36u/0?limit=1",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        count: z.number(),
        results: z.array(z.object({
          facility_id: z.string(),
          facility_name: z.string(),
          state: z.string(),
        })).min(1),
      }),
    ),
  },
  "crossref-works": {
    url: "https://api.crossref.org/works?query=wildfire&rows=1&select=DOI,title,published",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        status: z.literal("ok"),
        message: z.object({
          items: z.array(z.object({ DOI: z.string(), title: z.array(z.string()).min(1) })).min(1),
        }),
      }),
    ),
  },
  "gbif-species-occurrences": {
    url: "https://api.gbif.org/v1/occurrence/search?taxon_key=212&limit=1",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        count: z.number(),
        results: z.array(z.object({
          key: z.number(),
          scientificName: z.string(),
        })).min(1),
      }),
    ),
  },
  "imf-world-economic-outlook": {
    url: "https://www.imf.org/external/datamapper/api/v1/NGDP_RPCH/USA",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        values: z.object({
          NGDP_RPCH: z.object({ USA: z.record(z.string(), z.number()) }),
        }),
      }),
    ),
  },
  "mitre-attack-enterprise": {
    url: "https://attack-taxii.mitre.org/api/v21/collections/x-mitre-collection--1f5f1533-f617-4ca8-9ab4-6a02367fa019/objects/?limit=1",
    contentTypes: ["application/taxii+json;version=2.1"],
    validate: jsonValidator(
      z.object({
        objects: z.array(z.object({
          id: z.string(),
          type: z.string(),
        })).min(1),
      }),
    ),
  },
  "nasa-power-daily": {
    url: "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M&community=RE&longitude=-112.074&latitude=33.4484&start=20250701&end=20250701&format=JSON&time-standard=UTC",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        geometry: z.object({ coordinates: z.array(z.number()).min(2) }),
        properties: z.object({
          parameter: z.object({ T2M: z.record(z.string(), z.number()) }),
        }),
      }),
    ),
  },
  "nvd-cve": {
    url: "https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2021-44228",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        totalResults: z.number(),
        vulnerabilities: z.array(z.object({
          cve: z.object({ id: z.string(), published: z.string(), lastModified: z.string() }),
        })).min(1),
      }),
    ),
  },
  "pubmed-citations": {
    url: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=wildfire&retmax=1&retmode=json",
    contentTypes: ["application/json", "text/json"],
    validate: jsonValidator(
      z.object({
        esearchresult: z.object({
          count: z.string(),
          idlist: z.array(z.string()).min(1),
        }),
      }),
    ),
  },
  "unhcr-refugee-population": {
    url: "https://api.unhcr.org/population/v1/population/?year=2024&limit=1",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        maxPages: z.number(),
        items: z.array(z.object({
          year: z.number(),
          refugees: z.number().nullable(),
        })).min(1),
      }),
    ),
  },
  "bls-public-data-api": {
    url: "https://api.bls.gov/publicAPI/v2/timeseries/data/CUUR0000SA0?startyear=2024&endyear=2025",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        status: z.literal("REQUEST_SUCCEEDED"),
        Results: z.object({
          series: z.array(
            z.object({
              seriesID: z.string(),
              data: z.array(
                z.object({
                  year: z.string(),
                  period: z.string(),
                  value: z.string(),
                }),
              ).min(1),
            }),
          ).min(1),
        }),
      }),
    ),
  },
  "cisa-known-exploited-vulnerabilities": {
    url: "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        catalogVersion: z.string(),
        dateReleased: z.string(),
        vulnerabilities: z.array(
          z.object({
            cveID: z.string(),
            vendorProject: z.string(),
            product: z.string(),
            dateAdded: z.string(),
          }),
        ).min(1),
      }),
    ),
  },
  "federal-register-documents": {
    url: "https://www.federalregister.gov/api/v1/documents.json?per_page=1&order=newest",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        count: z.number(),
        results: z.array(
          z.object({
            document_number: z.string(),
            title: z.string(),
            type: z.string(),
            publication_date: z.string(),
          }),
        ).min(1),
      }),
    ),
  },
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
  "nhtsa-vehicle-recalls": {
    url: "https://api.nhtsa.gov/recalls/recallsByVehicle?make=honda&model=accord&modelYear=2023",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        Count: z.number(),
        results: z.array(
          z.object({
            NHTSACampaignNumber: z.string(),
            Component: z.string(),
            Summary: z.string(),
          }),
        ).min(1),
      }),
    ),
  },
  "noaa-ncei-daily-summaries": {
    url: "https://www.ncei.noaa.gov/access/services/data/v1?dataset=daily-summaries&stations=USW00094728&startDate=2025-07-01&endDate=2025-07-01&dataTypes=TMAX,TMIN,PRCP&format=json&units=standard&includeAttributes=true&includeStationName=true",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.array(
        z.object({
          STATION: z.string(),
          DATE: z.string(),
          TMAX: z.string(),
          TMIN: z.string(),
        }),
      ).min(1),
    ),
  },
  "noaa-tides-currents": {
    url: "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=20250101&end_date=20250101&station=9414290&product=hourly_height&datum=MLLW&time_zone=gmt&units=metric&application=TrilemmaDataValidator&format=json",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        metadata: z.object({ id: z.string(), name: z.string() }),
        data: z.array(
          z.object({
            t: z.string(),
            v: z.string(),
          }),
        ).min(1),
      }),
    ),
  },
  "openfda-drug-adverse-events": {
    url: "https://api.fda.gov/drug/event.json?search=receivedate:%5B20230101+TO+20231231%5D&limit=1",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        meta: z.object({
          last_updated: z.string(),
          results: z.object({ total: z.number() }),
        }),
        results: z.array(
          z.object({
            safetyreportid: z.string(),
            receivedate: z.string(),
            patient: z.object({ reaction: z.array(z.object({ reactionmeddrapt: z.string() })).min(1) }),
          }),
        ).min(1),
      }),
    ),
  },
  "openfema-disaster-declarations": {
    url: "https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=1&$orderby=disasterNumber%20desc",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        DisasterDeclarationsSummaries: z.array(
          z.object({
            disasterNumber: z.number(),
            declarationDate: z.string(),
            state: z.string(),
            declarationType: z.string(),
          }),
        ).min(1),
      }),
    ),
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
  "usgs-water-data": {
    url: "https://api.waterdata.usgs.gov/ogcapi/v0/collections/continuous/items?f=json&limit=1&datetime=2025-01-01T00:00:00Z%2F2025-01-02T00:00:00Z&monitoring_location_id=USGS-01646500&parameter_code=00060",
    contentTypes: ["application/geo+json", "application/json"],
    validate: jsonValidator(
      z.object({
        type: z.literal("FeatureCollection"),
        features: z.array(
          z.object({
            properties: z.object({
              monitoring_location_id: z.string(),
              parameter_code: z.string(),
              time: z.string(),
              value: z.string(),
              unit_of_measure: z.string(),
              approval_status: z.string(),
            }),
          }),
        ).min(1),
      }),
    ),
  },
  "treasury-securities-auctions": {
    url: "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query?filter=auction_date:eq:2025-01-02&page%5Bsize%5D=1",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        data: z.array(
          z.object({
            record_date: z.string(),
            cusip: z.string(),
            security_type: z.string(),
            security_term: z.string(),
            auction_date: z.string(),
          }),
        ).min(1),
        meta: z.object({ count: z.number() }),
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
  if (!Object.hasOwn(contracts, datasetId)) {
    return [`no provider contract is defined for ${datasetId}`];
  }
  const contract = contracts[datasetId as keyof typeof contracts];

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
    datasets
      .filter((dataset) => Object.hasOwn(contracts, dataset.id))
      .map(async (dataset) => [
        `${dataset.id}.yaml`,
        await checkProviderContract(dataset.id, options),
      ] as const),
  );
  return new Map(results.filter(([, errors]) => errors.length > 0));
}
