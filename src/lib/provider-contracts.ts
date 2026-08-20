import { z } from "zod";

export type ProviderFixture = {
  body: BodyInit;
  contentType: string;
};

export type ProviderContractDefinition = {
  url: string;
  range?: string;
  contentTypes: string[];
  validate(body: Uint8Array): string | null;
};

export type ProviderContract = ProviderContractDefinition & {
  valid: ProviderFixture;
  invalid: ProviderFixture & { expectedError: string | RegExp };
};
export function mediaTypeOf(contentType: string): string {
  return contentType.split(";", 1)[0]!.trim().toLowerCase();
}

export function jsonValidator(schema: z.ZodType) {
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

const contractDefinitions = {
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
  "nws-weather-api": {
    url: "https://api.weather.gov/points/40.7128,-74.0060",
    contentTypes: ["application/geo+json", "application/json", "application/ld+json"],
    validate: jsonValidator(
      z.object({
        properties: z.object({
          forecastHourly: z.string(),
        }),
      }),
    ),
  },
  "cdc-places": {
    url: "https://data.cdc.gov/resource/swc5-untb.json?$limit=1&$select=locationid,locationname,stateabbr,measureid,data_value",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.array(
        z.object({
          locationid: z.string(),
          locationname: z.string(),
          data_value: z.union([z.string(), z.number()]),
        }),
      ).min(1),
    ),
  },
  "sec-edgar-apis": {
    url: "https://data.sec.gov/submissions/CIK0000320193.json",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        filings: z.object({
          recent: z.object({
            filingDate: z.array(z.string()).min(1),
            form: z.array(z.string()).min(1),
          }),
        }),
      }),
    ),
  },
  "kalshi-market-data": {
    url: "https://external-api.kalshi.com/trade-api/v2/markets?limit=1&status=open",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        markets: z.array(
          z.object({
            ticker: z.string(),
            title: z.string(),
          }),
        ).min(1),
      }),
    ),
  },
  "cfpb-consumer-complaints": {
    url: "https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/?size=1&product=Mortgage",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        hits: z.object({
          hits: z.array(z.object({ _source: z.record(z.string(), z.unknown()) })).min(1),
        }),
      }),
    ),
  },
  "openfda-food-enforcement": {
    url: "https://api.fda.gov/food/enforcement.json?limit=1",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        meta: z.object({
          last_updated: z.string(),
          results: z.object({ total: z.number() }),
        }),
        results: z.array(
          z.object({
            recalling_firm: z.string(),
            product_description: z.string(),
            report_date: z.string(),
          }),
        ).min(1),
      }),
    ),
  },
  "osv-open-source-vulnerabilities": {
    url: "https://api.osv.dev/v1/vulns/GHSA-c3g4-w6cv-6v7h",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        id: z.string(),
      }),
    ),
  },
  "eurostat-statistics": {
    url: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/une_rt_m?format=JSON&lang=EN&geo=DE&s_adj=SA&age=TOTAL&sex=T&unit=PC_ACT&lastTimePeriod=1",
    contentTypes: ["application/json", "application/json-stat", "application/json;charset=UTF-8"],
    validate: jsonValidator(
      z.object({
        value: z.union([
          z.record(z.string(), z.number()),
          z.array(z.number().nullable()),
        ]),
        dimension: z.object({
          time: z.object({
            category: z.object({
              index: z.record(z.string(), z.number()),
            }),
          }),
        }),
      }),
    ),
  },
  "fhfa-house-price-index": {
    url: "https://www.fhfa.gov/hpi/download/monthly/hpi_master.csv",
    range: "bytes=0-65535",
    contentTypes: ["text/csv", "text/plain", "application/octet-stream", "application/csv"],
    validate(body: Uint8Array) {
      const header = new TextDecoder().decode(body).split(/\r?\n/, 1).join();
      return ["hpi_flavor", "place_name"].every((field) => header.includes(field))
        ? null
        : "CSV is missing hpi_flavor or place_name";
    },
  },
  "nppes-npi-registry": {
    url: "https://npiregistry.cms.hhs.gov/api/?version=2.1&city=Baltimore&state=MD&limit=1",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        results: z.array(z.object({ number: z.string() })).min(1),
      }),
    ),
  },
  "wikimedia-pageviews": {
    url: "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/Earth/daily/20250801/20250807",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        items: z.array(
          z.object({
            timestamp: z.string(),
            views: z.number(),
          }),
        ).min(1),
      }),
    ),
  },
  "arxiv-preprints": {
    url: "https://export.arxiv.org/api/query?search_query=cat:cs.LG&start=0&max_results=1",
    contentTypes: ["application/atom+xml", "text/xml", "application/xml"],
    validate(body: Uint8Array) {
      const text = new TextDecoder().decode(body);
      return text.includes("<feed") && text.toLowerCase().includes("arxiv")
        ? null
        : "response is not an arXiv Atom feed";
    },
  },
  "epa-echo-drinking-water": {
    url: "https://echodata.epa.gov/echo/sdw_rest_services.get_systems?output=JSON&p_st=RI&p_act=Y",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        Results: z.object({
          Systems: z.array(z.object({ PWSId: z.string() }).passthrough()).min(1),
        }),
      }),
    ),
  },
  "noaa-ibtracs": {
    url: "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/ibtracs.NA.list.v04r01.csv",
    range: "bytes=0-65535",
    contentTypes: ["text/csv", "text/plain", "application/octet-stream"],
    validate(body: Uint8Array) {
      const header = new TextDecoder().decode(body).split(/\r?\n/, 1).join();
      return header.includes("SID") && header.includes("NAME")
        ? null
        : "CSV is missing SID or NAME";
    },
  },
  "us-drought-monitor": {
    url: "https://usdmdataservices.unl.edu/api/StateStatistics/GetDroughtSeverityStatisticsByAreaPercent?aoi=08&startdate=8/12/2025&enddate=8/12/2025&statisticsType=1",
    contentTypes: ["application/json", "text/json"],
    validate: jsonValidator(
      z.array(
        z.object({
          mapDate: z.union([z.string(), z.number()]).optional(),
        }).passthrough(),
      ).min(1),
    ),
  },
  "epa-toxics-release-inventory": {
    url: "https://data.epa.gov/dmapservice/tri.tri_facility/state_abbr/equals/RI/1:1/json",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.array(
        z.object({
          state_abbr: z.string().optional(),
          facility_name: z.string().optional(),
        }).passthrough(),
      ).min(1),
    ),
  },
  "gdacs-disaster-alerts": {
    url: "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ&fromDate=2025-01-01&toDate=2026-08-17",
    contentTypes: ["application/json", "application/geo+json"],
    validate: jsonValidator(
      z.object({
        features: z.array(z.object({
          type: z.string().optional(),
          properties: z.record(z.string(), z.unknown()).optional(),
        })).min(1),
      }),
    ),
  },
  "noaa-swpc-space-weather": {
    url: "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.array(
        z.object({
          time_tag: z.string(),
        }).passthrough(),
      ).min(2),
    ),
  },
  "cpsc-product-recalls": {
    url: "https://www.saferproducts.gov/RestWebServices/Recall?format=json&RecallDateStart=2025-01-01&RecallDateEnd=2025-01-31",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.array(
        z.object({
          RecallNumber: z.union([z.string(), z.number()]),
        }).passthrough(),
      ).min(1),
    ),
  },
  "cdc-fluview-ilinet": {
    url: "https://data.cdc.gov/resource/6svj-q4zv.json?$limit=1",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.array(z.record(z.string(), z.unknown())).min(1),
    ),
  },
  "cdc-nwss-wastewater": {
    url: "https://data.cdc.gov/resource/ymmh-divb.json?$limit=1",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.array(
        z.object({
          site: z.string(),
          sample_collect_date: z.string(),
          pcr_target: z.string(),
        }).passthrough(),
      ).min(1),
    ),
  },
  "unesco-uis-statistics": {
    url: "https://api.uis.unesco.org/api/public/data/indicators?indicator=CR.1&geoUnit=USA&start=2020&end=2022",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        records: z.array(
          z.object({
            indicatorId: z.string(),
            geoUnit: z.string(),
            year: z.number(),
            value: z.number().nullable(),
          }).passthrough(),
        ).min(1),
      }).passthrough(),
    ),
  },
  "census-building-permits": {
    url: "https://www2.census.gov/econ/bps/County/co2025a.txt",
    range: "bytes=0-4095",
    contentTypes: ["text/plain", "text/csv", "application/octet-stream"],
    validate(body: Uint8Array) {
      const header = new TextDecoder().decode(body).split(/\r?\n/, 1).join();
      return /survey/i.test(header) && /fips/i.test(header)
        ? null
        : "CSV is missing Survey or FIPS header fields";
    },
  },
  "water-quality-portal": {
    url: "https://www.waterqualitydata.us/data/Result/search?siteid=USGS-01646500&characteristicName=Nitrate&startDateLo=01-01-2024&startDateHi=12-31-2024&mimeType=csv&zip=no&dataProfile=narrowResult",
    contentTypes: ["text/csv", "text/plain", "application/octet-stream", "application/csv"],
    validate(body: Uint8Array) {
      const header = new TextDecoder().decode(body).split(/\r?\n/, 1).join().split(",");
      return ["MonitoringLocationIdentifier", "CharacteristicName", "ResultMeasureValue"].every(
        (field) => header.includes(field),
      )
        ? null
        : "CSV is missing MonitoringLocationIdentifier, CharacteristicName, or ResultMeasureValue";
    },
  },
  "eur-lex-cellar": {
    url: "https://publications.europa.eu/webapi/rdf/sparql?query=PREFIX%20cdm%3A%20%3Chttp%3A%2F%2Fpublications.europa.eu%2Fontology%2Fcdm%23%3E%20SELECT%20%3Fwork%20%3Fdate%20WHERE%20%7B%20%3Fwork%20cdm%3Aresource_legal_id_celex%20%2232016R0679%22%5E%5E%3Chttp%3A%2F%2Fwww.w3.org%2F2001%2FXMLSchema%23string%3E%20%3B%20cdm%3Awork_date_document%20%3Fdate%20.%20%7D%20LIMIT%201&format=application/sparql-results%2Bjson",
    contentTypes: ["application/sparql-results+json", "application/json"],
    validate: jsonValidator(
      z.object({
        results: z.object({
          bindings: z.array(z.record(z.string(), z.unknown())).min(1),
        }),
      }).passthrough(),
    ),
  },
  "cms-open-payments": {
    url: "https://openpaymentsdata.cms.gov/api/1/datastore/query/e6b17c6a-2534-4207-a4a1-6746a14911ff/0?limit=1",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        results: z.array(z.record(z.string(), z.unknown())).min(1),
      }).passthrough(),
    ),
  },
  "deps-dev-package-graph": {
    url: "https://api.deps.dev/v3/systems/pypi/packages/requests/versions/2.32.3",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        versionKey: z.object({
          system: z.string(),
          name: z.string(),
          version: z.string(),
        }),
      }).passthrough(),
    ),
  },
  "first-epss": {
    url: "https://api.first.org/data/v1/epss?cve=CVE-2024-3400",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        data: z.array(
          z.object({
            cve: z.string(),
            epss: z.union([z.string(), z.number()]),
            percentile: z.union([z.string(), z.number()]),
          }).passthrough(),
        ).min(1),
      }).passthrough(),
    ),
  },
  "openssf-scorecard": {
    url: "https://api.scorecard.dev/projects/github.com/ossf/scorecard",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        score: z.number(),
        repo: z.object({
          name: z.string(),
        }).passthrough(),
      }).passthrough(),
    ),
  },
  "legislation-gov-uk": {
    url: "https://www.legislation.gov.uk/ukpga/2018/12/section/1/data.xml",
    contentTypes: ["application/xml", "text/xml", "application/xhtml+xml"],
    validate(body: Uint8Array) {
      return new TextDecoder().decode(body).toLowerCase().includes("legislation")
        ? null
        : "XML is missing legislation markup";
    },
  },
  "uk-police-street-crime": {
    url: "https://data.police.uk/api/crimes-street/all-crime?lat=51.5074&lng=-0.1278&date=2026-01",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.array(
        z.object({
          category: z.string(),
        }).passthrough(),
      ).min(1),
    ),
  },
  "gleif-lei": {
    url: "https://api.gleif.org/api/v1/lei-records?filter[lei]=5493001KJTIIGC8Y1R12",
    contentTypes: ["application/vnd.api+json", "application/json"],
    validate: jsonValidator(
      z.object({
        data: z.array(
          z.object({
            id: z.string(),
          }).passthrough(),
        ).min(1),
      }).passthrough(),
    ),
  },
  "fdic-bank-find": {
    url: "https://api.fdic.gov/banks/institutions?filters=STALP:IA&limit=1&format=json",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        data: z.array(z.record(z.string(), z.unknown())).min(1),
      }).passthrough(),
    ),
  },
  "cftc-commitment-of-traders": {
    url: "https://publicreporting.cftc.gov/resource/jun7-fc8e.json?$limit=1",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.array(z.record(z.string(), z.unknown())).min(1),
    ),
  },
  "ecb-statistical-data-warehouse": {
    url: "https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?lastNObservations=1&format=jsondata",
    contentTypes: ["application/json", "application/vnd.sdmx.data+json"],
    validate: jsonValidator(
      z.object({
        dataSets: z.array(z.record(z.string(), z.unknown())).min(1),
      }).passthrough(),
    ),
  },
  "open-food-facts": {
    url: "https://world.openfoodfacts.org/api/v2/product/737628064502.json",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        product: z.object({
          code: z.string(),
        }).passthrough(),
      }).passthrough(),
    ),
  },
  "cms-nursing-homes": {
    url: "https://data.cms.gov/provider-data/api/1/datastore/query/4pq5-n9py/0?limit=1",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        results: z.array(z.record(z.string(), z.unknown())).min(1),
      }).passthrough(),
    ),
  },
  "who-gho-indicators": {
    url: "https://ghoapi.azureedge.net/api/WHOSIS_000001?$filter=SpatialDim%20eq%20'USA'&$top=1",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        value: z.array(z.record(z.string(), z.unknown())).min(1),
      }).passthrough(),
    ),
  },
  "wikidata-query": {
    url: "https://query.wikidata.org/sparql?query=SELECT%20%3Fitem%20WHERE%20%7B%20wd%3AQ42%20wdt%3AP31%20%3Fitem%20%7D%20LIMIT%201&format=json",
    contentTypes: ["application/sparql-results+json", "application/json"],
    validate: jsonValidator(
      z.object({
        results: z.object({
          bindings: z.array(z.record(z.string(), z.unknown())).min(1),
        }),
      }).passthrough(),
    ),
  },
  "met-norway-locationforecast": {
    url: "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.91&lon=10.75",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        properties: z.object({
          timeseries: z.array(z.record(z.string(), z.unknown())).min(1),
        }).passthrough(),
      }).passthrough(),
    ),
  },
  "osm-overpass": {
    url: "https://overpass-api.de/api/interpreter?data=%5Bout%3Ajson%5D%5Btimeout%3A10%5D%3Bnode%5B%22amenity%22%3D%22cafe%22%5D(40.748,-73.988,40.751,-73.985)%3Bout%201%3B",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        elements: z.array(z.record(z.string(), z.unknown())).min(1),
      }).passthrough(),
    ),
  },
  "ourairports": {
    url: "https://davidmegginson.github.io/ourairports-data/airports.csv",
    range: "bytes=0-65535",
    contentTypes: ["text/csv", "text/plain", "application/octet-stream"],
    validate(body: Uint8Array) {
      const header = new TextDecoder().decode(body).split(/\r?\n/, 1).join();
      return ["ident", "type", "name", "latitude_deg"].every((field) => header.includes(field))
        ? null
        : "CSV is missing ident, type, name, or latitude_deg";
    },
  },
  "nsf-awards": {
    url: "https://api.nsf.gov/services/v1/awards.json?keyword=quantum&rpp=1",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        response: z.object({
          award: z.array(z.object({ id: z.string(), title: z.string() })).min(1),
        }),
      }),
    ),
  },
  "treasury-debt-to-the-penny": {
    url: "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?fields=record_date,tot_pub_debt_out_amt&sort=-record_date&page[size]=1",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        data: z.array(z.object({
          record_date: z.string(),
          tot_pub_debt_out_amt: z.string(),
        })).min(1),
      }),
    ),
  },
  "noaa-gml-co2": {
    url: "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.csv",
    range: "bytes=0-4096",
    contentTypes: ["text/csv", "text/plain", "application/octet-stream"],
    validate(body: Uint8Array) {
      const text = new TextDecoder().decode(body);
      return text.includes("year") && (text.includes("average") || text.includes("deseasonalized"))
        ? null
        : "CSV is missing year or average columns";
    },
  },
  "pubchem-compounds": {
    url: "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/aspirin/property/MolecularFormula,MolecularWeight/JSON",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        PropertyTable: z.object({
          Properties: z.array(z.object({
            CID: z.number(),
            MolecularFormula: z.string(),
          })).min(1),
        }),
      }),
    ),
  },
  "dailymed-drug-labels": {
    url: "https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=ibuprofen&pagesize=1",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        data: z.array(z.record(z.string(), z.unknown())).min(1),
      }),
    ),
  },
  "openfda-device-events": {
    url: "https://api.fda.gov/device/event.json?search=date_received:%5B20240101+TO+20241231%5D&limit=1",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        meta: z.object({
          results: z.object({ total: z.number() }),
        }),
        results: z.array(z.object({
          mdr_report_key: z.string().optional(),
        }).passthrough()).min(1),
      }),
    ),
  },
  "fema-nfip-redacted-claims": {
    url: "https://www.fema.gov/api/open/v2/FimaNfipClaims?$top=1",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        FimaNfipClaims: z.array(z.object({
          id: z.string(),
          state: z.string().optional(),
        }).passthrough()).min(1),
      }),
    ),
  },
  "ripe-stat": {
    url: "https://stat.ripe.net/data/prefix-overview/data.json?resource=8.8.8.0/24",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        data: z.object({
          resource: z.string(),
        }).passthrough(),
      }),
    ),
  },
  "nchs-provisional-mortality": {
    url: "https://data.cdc.gov/resource/muzy-jte6.json?$limit=1",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.array(z.object({
        jurisdiction_of_occurrence: z.string(),
      }).passthrough()).min(1),
    ),
  },
  "noaa-ndbc-buoys": {
    url: "https://www.ndbc.noaa.gov/data/realtime2/41001.txt",
    range: "bytes=0-2048",
    contentTypes: ["text/plain", "text/csv", "application/octet-stream"],
    validate(body: Uint8Array) {
      const header = new TextDecoder().decode(body);
      return header.includes("WSPD") && header.includes("WVHT")
        ? null
        : "buoy file is missing WSPD or WVHT";
    },
  },
  "ons-statistics": {
    url: "https://api.beta.ons.gov.uk/v1/datasets/cpih01",
    contentTypes: ["application/json"],
    validate: jsonValidator(
      z.object({
        id: z.string(),
        title: z.string().optional(),
      }).passthrough(),
    ),
  },
} satisfies Record<string, ProviderContractDefinition>;

const validBodies = {
  "clinicaltrials-studies": JSON.stringify({
    studies: [{ protocolSection: { identificationModule: { nctId: "NCT00000001", briefTitle: "Example" } } }],
  }),
  "cms-care-compare-hospitals": JSON.stringify({
    count: 1,
    results: [{ facility_id: "000001", facility_name: "Example Hospital", state: "CA" }],
  }),
  "crossref-works": JSON.stringify({
    status: "ok",
    message: { items: [{ DOI: "10.0000/example", title: ["Example"] }] },
  }),
  "gbif-species-occurrences": JSON.stringify({
    count: 1,
    results: [{ key: 1, scientificName: "Danaus plexippus" }],
  }),
  "imf-world-economic-outlook": JSON.stringify({
    values: { NGDP_RPCH: { USA: { "2025": 2.1 } } },
  }),
  "mitre-attack-enterprise": JSON.stringify({
    objects: [{ id: "attack-pattern--example", type: "attack-pattern" }],
  }),
  "nasa-power-daily": JSON.stringify({
    geometry: { coordinates: [-112.074, 33.4484] },
    properties: { parameter: { T2M: { "20250701": 35.1 } } },
  }),
  "nvd-cve": JSON.stringify({
    totalResults: 1,
    vulnerabilities: [{ cve: { id: "CVE-2021-44228", published: "2021-12-10", lastModified: "2026-01-01" } }],
  }),
  "pubmed-citations": JSON.stringify({
    esearchresult: { count: "1", idlist: ["1"] },
  }),
  "unhcr-refugee-population": JSON.stringify({
    maxPages: 1,
    items: [{ year: 2024, refugees: 1 }],
  }),
  "bls-public-data-api": JSON.stringify({
    status: "REQUEST_SUCCEEDED",
    Results: {
      series: [{ seriesID: "CUUR0000SA0", data: [{ year: "2025", period: "M01", value: "1" }] }],
    },
  }),
  "cisa-known-exploited-vulnerabilities": JSON.stringify({
    catalogVersion: "2026.08.11",
    dateReleased: "2026-08-11",
    vulnerabilities: [{
      cveID: "CVE-2026-0001",
      vendorProject: "Example",
      product: "Example",
      dateAdded: "2026-08-11",
    }],
  }),
  "federal-register-documents": JSON.stringify({
    count: 1,
    results: [{
      document_number: "2026-00001",
      title: "Example",
      type: "Rule",
      publication_date: "2026-08-11",
    }],
  }),
  "nasa-firms": "latitude,longitude,acq_date,frp\n1,2,2026-08-10,3",
  "natural-earth": new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
  "nhtsa-vehicle-recalls": JSON.stringify({
    Count: 1,
    results: [{
      NHTSACampaignNumber: "26V001",
      Component: "EQUIPMENT",
      Summary: "Example recall",
    }],
  }),
  "noaa-ncei-daily-summaries": JSON.stringify([
    { STATION: "USW00094728", DATE: "2025-07-01", TMAX: "89", TMIN: "72" },
  ]),
  "noaa-tides-currents": JSON.stringify({
    metadata: { id: "9414290", name: "San Francisco" },
    data: [{ t: "2025-01-01 00:00", v: "0.035" }],
  }),
  "openfda-drug-adverse-events": JSON.stringify({
    meta: { last_updated: "2026-07-30", results: { total: 1 } },
    results: [{
      safetyreportid: "1",
      receivedate: "20230101",
      patient: { reaction: [{ reactionmeddrapt: "Example" }] },
    }],
  }),
  "openfema-disaster-declarations": JSON.stringify({
    DisasterDeclarationsSummaries: [{
      disasterNumber: 1,
      declarationDate: "2026-08-11T00:00:00.000Z",
      state: "CA",
      declarationType: "DR",
    }],
  }),
  "polymarket-markets": JSON.stringify([
    { question: "Will it rain?", volume: "10", liquidity: 5 },
  ]),
  "usgs-earthquakes": JSON.stringify({
    features: [{ properties: { mag: null, place: null, time: 1 } }],
  }),
  "usgs-water-data": JSON.stringify({
    type: "FeatureCollection",
    features: [{
      properties: {
        monitoring_location_id: "USGS-01646500",
        parameter_code: "00060",
        time: "2025-01-01T00:00:00+00:00",
        value: "4510",
        unit_of_measure: "ft^3/s",
        approval_status: "Approved",
      },
    }],
  }),
  "treasury-securities-auctions": JSON.stringify({
    data: [{
      record_date: "2025-01-07",
      cusip: "912797NF0",
      security_type: "Bill",
      security_term: "4-Week",
      auction_date: "2025-01-02",
    }],
    meta: { count: 1 },
  }),
  "world-development-indicators": JSON.stringify([
    { page: 1, pages: 1, total: 1 },
    [{ countryiso3code: "USA", date: "2025", value: null }],
  ]),
  "nws-weather-api": JSON.stringify({
    properties: {
      forecastHourly: "https://api.weather.gov/gridpoints/OKX/33,37/forecast/hourly",
    },
  }),
  "cdc-places": JSON.stringify([
    { locationid: "06037", locationname: "Los Angeles", data_value: "10.1" },
  ]),
  "sec-edgar-apis": JSON.stringify({
    filings: { recent: { filingDate: ["2026-01-02"], form: ["8-K"] } },
  }),
  "kalshi-market-data": JSON.stringify({
    markets: [{ ticker: "KXTEST", title: "Example market" }],
  }),
  "cfpb-consumer-complaints": JSON.stringify({
    hits: { hits: [{ _source: { company: "Example Bank", product: "Mortgage" } }] },
  }),
  "openfda-food-enforcement": JSON.stringify({
    meta: { last_updated: "2026-07-30", results: { total: 1 } },
    results: [{
      recalling_firm: "Example Foods",
      product_description: "Example product",
      report_date: "20250115",
    }],
  }),
  "osv-open-source-vulnerabilities": JSON.stringify({
    id: "GHSA-c3g4-w6cv-6v7h",
    summary: "Example advisory",
  }),
  "eurostat-statistics": JSON.stringify({
    value: { "0": 3.2 },
    dimension: { time: { category: { index: { "2025-01": 0 } } } },
  }),
  "fhfa-house-price-index": "hpi_type,hpi_flavor,frequency,level,place_name\ntraditional,purchase-only,monthly,State,California",
  "nppes-npi-registry": JSON.stringify({
    results: [{ number: "1679576344" }],
  }),
  "wikimedia-pageviews": JSON.stringify({
    items: [{ timestamp: "2025080100", views: 1234 }],
  }),
  "arxiv-preprints": "<feed xmlns=\"http://www.w3.org/2005/Atom\"><title>ArXiv Query</title></feed>",
  "epa-echo-drinking-water": JSON.stringify({
    Results: { Systems: [{ PWSId: "RI0000001" }] },
  }),
  "noaa-ibtracs": "SID,NAME,ISO_TIME,LAT,LON\nNA0001,EXAMPLE,2025-01-01,20,60",
  "us-drought-monitor": JSON.stringify([
    { mapDate: "2025-08-12T00:00:00", stateAbbreviation: "CO", d1: "47.28" },
  ]),
  "epa-toxics-release-inventory": JSON.stringify([
    { state_abbr: "RI", facility_name: "Example Facility" },
  ]),
  "gdacs-disaster-alerts": JSON.stringify({
    features: [{ type: "Feature", properties: { eventid: 1 } }],
  }),
  "noaa-swpc-space-weather": JSON.stringify([
    { time_tag: "2026-08-17T00:00:00", Kp: 2 },
    { time_tag: "2026-08-17T03:00:00", Kp: 3 },
  ]),
  "cpsc-product-recalls": JSON.stringify([
    { RecallNumber: "25-001", Title: "Example recall" },
  ]),
  "cdc-fluview-ilinet": JSON.stringify([
    { week_ending: "2025-01-04", activity_level: "2" },
  ]),
  "cdc-nwss-wastewater": JSON.stringify([
    { site: "103", sample_collect_date: "2023-09-10", pcr_target: "fluav" },
  ]),
  "unesco-uis-statistics": JSON.stringify({
    records: [{ indicatorId: "CR.1", geoUnit: "USA", year: 2022, value: 99.5 }],
  }),
  "census-building-permits":
    "Survey,FIPS,FIPS,Region,Division,County\nDate,State,County,Code,Code,Name\n",
  "water-quality-portal":
    "MonitoringLocationIdentifier,CharacteristicName,ResultMeasureValue\nUSGS-01646500,Nitrate,1.2\n",
  "eur-lex-cellar": JSON.stringify({
    results: {
      bindings: [
        {
          work: { type: "uri", value: "http://publications.europa.eu/resource/cellar/example" },
          date: { type: "literal", value: "2016-04-27" },
        },
      ],
    },
  }),
  "cms-open-payments": JSON.stringify({
    results: [{ teaching_hospital_name: "Example", total_amount_of_payment_usdollars: "10.00" }],
  }),
  "deps-dev-package-graph": JSON.stringify({
    versionKey: { system: "PYPI", name: "requests", version: "2.32.3" },
  }),
  "first-epss": JSON.stringify({
    data: [{ cve: "CVE-2024-3400", epss: "0.9", percentile: "0.99" }],
  }),
  "openssf-scorecard": JSON.stringify({
    score: 8.5,
    repo: { name: "github.com/ossf/scorecard" },
  }),
  "legislation-gov-uk": "<Legislation><Title>Data Protection Act 2018</Title></Legislation>",
  "uk-police-street-crime": JSON.stringify([
    { category: "anti-social-behaviour", month: "2026-01" },
  ]),
  "gleif-lei": JSON.stringify({
    data: [{ id: "5493001KJTIIGC8Y1R12", type: "lei-records" }],
  }),
  "fdic-bank-find": JSON.stringify({
    data: [{ data: { NAME: "Example Bank", CERT: "1" } }],
  }),
  "cftc-commitment-of-traders": JSON.stringify([
    { contract_market_name: "GOLD", open_interest_all: "1" },
  ]),
  "ecb-statistical-data-warehouse": JSON.stringify({
    dataSets: [{ series: {} }],
  }),
  "open-food-facts": JSON.stringify({
    product: { code: "737628064502", product_name: "Example" },
  }),
  "cms-nursing-homes": JSON.stringify({
    results: [{ cms_certification_number_ccn: "000000", provider_name: "Example" }],
  }),
  "who-gho-indicators": JSON.stringify({
    value: [{ IndicatorCode: "WHOSIS_000001", SpatialDim: "USA" }],
  }),
  "wikidata-query": JSON.stringify({
    results: { bindings: [{ item: { type: "uri", value: "http://www.wikidata.org/entity/Q5" } }] },
  }),
  "met-norway-locationforecast": JSON.stringify({
    properties: { timeseries: [{ time: "2026-08-18T00:00:00Z" }] },
  }),
  "osm-overpass": JSON.stringify({
    elements: [{ type: "node", id: 1, lat: 40.75, lon: -73.98 }],
  }),
  "ourairports": "id,ident,type,name,latitude_deg,longitude_deg\n1,KSEA,large_airport,Seattle,47.45,-122.31",
  "nsf-awards": JSON.stringify({
    response: { award: [{ id: "1234567", title: "Example quantum award" }] },
  }),
  "treasury-debt-to-the-penny": JSON.stringify({
    data: [{ record_date: "2026-08-14", tot_pub_debt_out_amt: "37000000000000.00" }],
  }),
  "noaa-gml-co2": "year,month,decimal date,average,deseasonalized\n2026,1,2026.042,427.01,425.50\n",
  "pubchem-compounds": JSON.stringify({
    PropertyTable: { Properties: [{ CID: 2244, MolecularFormula: "C9H8O4" }] },
  }),
  "dailymed-drug-labels": JSON.stringify({
    data: [{ setid: "example", title: "IBUPROFEN" }],
  }),
  "openfda-device-events": JSON.stringify({
    meta: { results: { total: 1 } },
    results: [{ mdr_report_key: "123" }],
  }),
  "fema-nfip-redacted-claims": JSON.stringify({
    FimaNfipClaims: [{ id: "abc", state: "FL" }],
  }),
  "ripe-stat": JSON.stringify({
    data: { resource: "8.8.8.0/24" },
  }),
  "nchs-provisional-mortality": JSON.stringify([
    { jurisdiction_of_occurrence: "California" },
  ]),
  "noaa-ndbc-buoys": "#YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD\n2026 08 17 12 00 180 8.0 10.0 1.5 8.0 6.0 180\n",
  "ons-statistics": JSON.stringify({
    id: "cpih01",
    title: "Consumer Prices Index including owner occupiers' housing costs",
  }),
} as const;

const contentTypes = {
  "clinicaltrials-studies": "application/json",
  "cms-care-compare-hospitals": "application/json",
  "crossref-works": "application/json",
  "gbif-species-occurrences": "application/json",
  "imf-world-economic-outlook": "application/json",
  "mitre-attack-enterprise": "application/taxii+json;version=2.1",
  "nasa-power-daily": "application/json",
  "nvd-cve": "application/json",
  "pubmed-citations": "application/json",
  "unhcr-refugee-population": "application/json",
  "bls-public-data-api": "application/json",
  "cisa-known-exploited-vulnerabilities": "application/json",
  "federal-register-documents": "application/json",
  "nasa-firms": "text/csv; charset=utf-8",
  "natural-earth": "application/zip",
  "nhtsa-vehicle-recalls": "application/json",
  "noaa-ncei-daily-summaries": "application/json",
  "noaa-tides-currents": "application/json",
  "openfda-drug-adverse-events": "application/json",
  "openfema-disaster-declarations": "application/json",
  "polymarket-markets": "application/json",
  "usgs-earthquakes": "application/json; charset=utf-8",
  "usgs-water-data": "application/geo+json",
  "treasury-securities-auctions": "application/json",
  "world-development-indicators": "application/json",
  "nws-weather-api": "application/geo+json",
  "cdc-places": "application/json",
  "sec-edgar-apis": "application/json",
  "kalshi-market-data": "application/json",
  "cfpb-consumer-complaints": "application/json",
  "openfda-food-enforcement": "application/json",
  "osv-open-source-vulnerabilities": "application/json",
  "eurostat-statistics": "application/json",
  "fhfa-house-price-index": "text/csv",
  "nppes-npi-registry": "application/json",
  "wikimedia-pageviews": "application/json",
  "arxiv-preprints": "application/atom+xml",
  "epa-echo-drinking-water": "application/json",
  "noaa-ibtracs": "text/csv",
  "us-drought-monitor": "application/json",
  "epa-toxics-release-inventory": "application/json",
  "gdacs-disaster-alerts": "application/json",
  "noaa-swpc-space-weather": "application/json",
  "cpsc-product-recalls": "application/json",
  "cdc-fluview-ilinet": "application/json",
  "cdc-nwss-wastewater": "application/json",
  "unesco-uis-statistics": "application/json",
  "census-building-permits": "text/plain",
  "water-quality-portal": "text/csv",
  "eur-lex-cellar": "application/sparql-results+json",
  "cms-open-payments": "application/json",
  "deps-dev-package-graph": "application/json",
  "first-epss": "application/json",
  "openssf-scorecard": "application/json",
  "legislation-gov-uk": "application/xml",
  "uk-police-street-crime": "application/json",
  "gleif-lei": "application/vnd.api+json",
  "fdic-bank-find": "application/json",
  "cftc-commitment-of-traders": "application/json",
  "ecb-statistical-data-warehouse": "application/json",
  "open-food-facts": "application/json",
  "cms-nursing-homes": "application/json",
  "who-gho-indicators": "application/json",
  "wikidata-query": "application/sparql-results+json",
  "met-norway-locationforecast": "application/json",
  "osm-overpass": "application/json",
  "ourairports": "text/csv",
  "nsf-awards": "application/json",
  "treasury-debt-to-the-penny": "application/json",
  "noaa-gml-co2": "text/csv",
  "pubchem-compounds": "application/json",
  "dailymed-drug-labels": "application/json",
  "openfda-device-events": "application/json",
  "fema-nfip-redacted-claims": "application/json",
  "ripe-stat": "application/json",
  "nchs-provisional-mortality": "application/json",
  "noaa-ndbc-buoys": "text/plain",
  "ons-statistics": "application/json",
} as const;

const fixtures = {
  'clinicaltrials-studies': {
    valid: {
      body: validBodies['clinicaltrials-studies'],
      contentType: contentTypes['clinicaltrials-studies'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['clinicaltrials-studies'],
      expectedError: /response contract mismatch/,
    },
  },
  'cms-care-compare-hospitals': {
    valid: {
      body: validBodies['cms-care-compare-hospitals'],
      contentType: contentTypes['cms-care-compare-hospitals'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['cms-care-compare-hospitals'],
      expectedError: /response contract mismatch/,
    },
  },
  'crossref-works': {
    valid: {
      body: validBodies['crossref-works'],
      contentType: contentTypes['crossref-works'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['crossref-works'],
      expectedError: /response contract mismatch/,
    },
  },
  'gbif-species-occurrences': {
    valid: {
      body: validBodies['gbif-species-occurrences'],
      contentType: contentTypes['gbif-species-occurrences'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['gbif-species-occurrences'],
      expectedError: /response contract mismatch/,
    },
  },
  'imf-world-economic-outlook': {
    valid: {
      body: validBodies['imf-world-economic-outlook'],
      contentType: contentTypes['imf-world-economic-outlook'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['imf-world-economic-outlook'],
      expectedError: /response contract mismatch/,
    },
  },
  'mitre-attack-enterprise': {
    valid: {
      body: validBodies['mitre-attack-enterprise'],
      contentType: contentTypes['mitre-attack-enterprise'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['mitre-attack-enterprise'],
      expectedError: /response contract mismatch/,
    },
  },
  'nasa-power-daily': {
    valid: {
      body: validBodies['nasa-power-daily'],
      contentType: contentTypes['nasa-power-daily'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['nasa-power-daily'],
      expectedError: /response contract mismatch/,
    },
  },
  'nvd-cve': {
    valid: {
      body: validBodies['nvd-cve'],
      contentType: contentTypes['nvd-cve'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['nvd-cve'],
      expectedError: /response contract mismatch/,
    },
  },
  'pubmed-citations': {
    valid: {
      body: validBodies['pubmed-citations'],
      contentType: contentTypes['pubmed-citations'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['pubmed-citations'],
      expectedError: /response contract mismatch/,
    },
  },
  'unhcr-refugee-population': {
    valid: {
      body: validBodies['unhcr-refugee-population'],
      contentType: contentTypes['unhcr-refugee-population'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['unhcr-refugee-population'],
      expectedError: /response contract mismatch/,
    },
  },
  'bls-public-data-api': {
    valid: {
      body: validBodies['bls-public-data-api'],
      contentType: contentTypes['bls-public-data-api'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['bls-public-data-api'],
      expectedError: /response contract mismatch/,
    },
  },
  'cisa-known-exploited-vulnerabilities': {
    valid: {
      body: validBodies['cisa-known-exploited-vulnerabilities'],
      contentType: contentTypes['cisa-known-exploited-vulnerabilities'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['cisa-known-exploited-vulnerabilities'],
      expectedError: /response contract mismatch/,
    },
  },
  'federal-register-documents': {
    valid: {
      body: validBodies['federal-register-documents'],
      contentType: contentTypes['federal-register-documents'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['federal-register-documents'],
      expectedError: /response contract mismatch/,
    },
  },
  'nasa-firms': {
    valid: {
      body: validBodies['nasa-firms'],
      contentType: contentTypes['nasa-firms'],
    },
    invalid: {
      body: "latitude",
      contentType: contentTypes['nasa-firms'],
      expectedError: "CSV is missing latitude, longitude, acq_date, or frp",
    },
  },
  'natural-earth': {
    valid: {
      body: validBodies['natural-earth'],
      contentType: contentTypes['natural-earth'],
    },
    invalid: {
      body: "HTML",
      contentType: contentTypes['natural-earth'],
      expectedError: "download is not a ZIP archive",
    },
  },
  'nhtsa-vehicle-recalls': {
    valid: {
      body: validBodies['nhtsa-vehicle-recalls'],
      contentType: contentTypes['nhtsa-vehicle-recalls'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['nhtsa-vehicle-recalls'],
      expectedError: /response contract mismatch/,
    },
  },
  'noaa-ncei-daily-summaries': {
    valid: {
      body: validBodies['noaa-ncei-daily-summaries'],
      contentType: contentTypes['noaa-ncei-daily-summaries'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['noaa-ncei-daily-summaries'],
      expectedError: /response contract mismatch/,
    },
  },
  'noaa-tides-currents': {
    valid: {
      body: validBodies['noaa-tides-currents'],
      contentType: contentTypes['noaa-tides-currents'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['noaa-tides-currents'],
      expectedError: /response contract mismatch/,
    },
  },
  'openfda-drug-adverse-events': {
    valid: {
      body: validBodies['openfda-drug-adverse-events'],
      contentType: contentTypes['openfda-drug-adverse-events'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['openfda-drug-adverse-events'],
      expectedError: /response contract mismatch/,
    },
  },
  'openfema-disaster-declarations': {
    valid: {
      body: validBodies['openfema-disaster-declarations'],
      contentType: contentTypes['openfema-disaster-declarations'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['openfema-disaster-declarations'],
      expectedError: /response contract mismatch/,
    },
  },
  'polymarket-markets': {
    valid: {
      body: validBodies['polymarket-markets'],
      contentType: contentTypes['polymarket-markets'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['polymarket-markets'],
      expectedError: /response contract mismatch/,
    },
  },
  'usgs-earthquakes': {
    valid: {
      body: validBodies['usgs-earthquakes'],
      contentType: contentTypes['usgs-earthquakes'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['usgs-earthquakes'],
      expectedError: /response contract mismatch/,
    },
  },
  'usgs-water-data': {
    valid: {
      body: validBodies['usgs-water-data'],
      contentType: contentTypes['usgs-water-data'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['usgs-water-data'],
      expectedError: /response contract mismatch/,
    },
  },
  'treasury-securities-auctions': {
    valid: {
      body: validBodies['treasury-securities-auctions'],
      contentType: contentTypes['treasury-securities-auctions'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['treasury-securities-auctions'],
      expectedError: /response contract mismatch/,
    },
  },
  'world-development-indicators': {
    valid: {
      body: validBodies['world-development-indicators'],
      contentType: contentTypes['world-development-indicators'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['world-development-indicators'],
      expectedError: /response contract mismatch/,
    },
  },
  'nws-weather-api': {
    valid: {
      body: validBodies['nws-weather-api'],
      contentType: contentTypes['nws-weather-api'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['nws-weather-api'],
      expectedError: /response contract mismatch/,
    },
  },
  'cdc-places': {
    valid: {
      body: validBodies['cdc-places'],
      contentType: contentTypes['cdc-places'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['cdc-places'],
      expectedError: /response contract mismatch/,
    },
  },
  'sec-edgar-apis': {
    valid: {
      body: validBodies['sec-edgar-apis'],
      contentType: contentTypes['sec-edgar-apis'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['sec-edgar-apis'],
      expectedError: /response contract mismatch/,
    },
  },
  'kalshi-market-data': {
    valid: {
      body: validBodies['kalshi-market-data'],
      contentType: contentTypes['kalshi-market-data'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['kalshi-market-data'],
      expectedError: /response contract mismatch/,
    },
  },
  'cfpb-consumer-complaints': {
    valid: {
      body: validBodies['cfpb-consumer-complaints'],
      contentType: contentTypes['cfpb-consumer-complaints'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['cfpb-consumer-complaints'],
      expectedError: /response contract mismatch/,
    },
  },
  'openfda-food-enforcement': {
    valid: {
      body: validBodies['openfda-food-enforcement'],
      contentType: contentTypes['openfda-food-enforcement'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['openfda-food-enforcement'],
      expectedError: /response contract mismatch/,
    },
  },
  'osv-open-source-vulnerabilities': {
    valid: {
      body: validBodies['osv-open-source-vulnerabilities'],
      contentType: contentTypes['osv-open-source-vulnerabilities'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['osv-open-source-vulnerabilities'],
      expectedError: /response contract mismatch/,
    },
  },
  'eurostat-statistics': {
    valid: {
      body: validBodies['eurostat-statistics'],
      contentType: contentTypes['eurostat-statistics'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['eurostat-statistics'],
      expectedError: /response contract mismatch/,
    },
  },
  'fhfa-house-price-index': {
    valid: {
      body: validBodies['fhfa-house-price-index'],
      contentType: contentTypes['fhfa-house-price-index'],
    },
    invalid: {
      body: "not-hpi",
      contentType: contentTypes['fhfa-house-price-index'],
      expectedError: "CSV is missing hpi_flavor or place_name",
    },
  },
  'nppes-npi-registry': {
    valid: {
      body: validBodies['nppes-npi-registry'],
      contentType: contentTypes['nppes-npi-registry'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['nppes-npi-registry'],
      expectedError: /response contract mismatch/,
    },
  },
  'wikimedia-pageviews': {
    valid: {
      body: validBodies['wikimedia-pageviews'],
      contentType: contentTypes['wikimedia-pageviews'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['wikimedia-pageviews'],
      expectedError: /response contract mismatch/,
    },
  },
  'arxiv-preprints': {
    valid: {
      body: validBodies['arxiv-preprints'],
      contentType: contentTypes['arxiv-preprints'],
    },
    invalid: {
      body: "<html>arxiv</html>",
      contentType: contentTypes['arxiv-preprints'],
      expectedError: "response is not an arXiv Atom feed",
    },
  },
  'epa-echo-drinking-water': {
    valid: {
      body: validBodies['epa-echo-drinking-water'],
      contentType: contentTypes['epa-echo-drinking-water'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['epa-echo-drinking-water'],
      expectedError: /response contract mismatch/,
    },
  },
  'noaa-ibtracs': {
    valid: {
      body: validBodies['noaa-ibtracs'],
      contentType: contentTypes['noaa-ibtracs'],
    },
    invalid: {
      body: "not-storms",
      contentType: contentTypes['noaa-ibtracs'],
      expectedError: "CSV is missing SID or NAME",
    },
  },
  'us-drought-monitor': {
    valid: {
      body: validBodies['us-drought-monitor'],
      contentType: contentTypes['us-drought-monitor'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['us-drought-monitor'],
      expectedError: /response contract mismatch/,
    },
  },
  'epa-toxics-release-inventory': {
    valid: {
      body: validBodies['epa-toxics-release-inventory'],
      contentType: contentTypes['epa-toxics-release-inventory'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['epa-toxics-release-inventory'],
      expectedError: /response contract mismatch/,
    },
  },
  'gdacs-disaster-alerts': {
    valid: {
      body: validBodies['gdacs-disaster-alerts'],
      contentType: contentTypes['gdacs-disaster-alerts'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['gdacs-disaster-alerts'],
      expectedError: /response contract mismatch/,
    },
  },
  'noaa-swpc-space-weather': {
    valid: {
      body: validBodies['noaa-swpc-space-weather'],
      contentType: contentTypes['noaa-swpc-space-weather'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['noaa-swpc-space-weather'],
      expectedError: /response contract mismatch/,
    },
  },
  'cpsc-product-recalls': {
    valid: {
      body: validBodies['cpsc-product-recalls'],
      contentType: contentTypes['cpsc-product-recalls'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['cpsc-product-recalls'],
      expectedError: /response contract mismatch/,
    },
  },
  'cdc-fluview-ilinet': {
    valid: {
      body: validBodies['cdc-fluview-ilinet'],
      contentType: contentTypes['cdc-fluview-ilinet'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['cdc-fluview-ilinet'],
      expectedError: /response contract mismatch/,
    },
  },
  'cdc-nwss-wastewater': {
    valid: {
      body: validBodies['cdc-nwss-wastewater'],
      contentType: contentTypes['cdc-nwss-wastewater'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['cdc-nwss-wastewater'],
      expectedError: /response contract mismatch/,
    },
  },
  'unesco-uis-statistics': {
    valid: {
      body: validBodies['unesco-uis-statistics'],
      contentType: contentTypes['unesco-uis-statistics'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['unesco-uis-statistics'],
      expectedError: /response contract mismatch/,
    },
  },
  'census-building-permits': {
    valid: {
      body: validBodies['census-building-permits'],
      contentType: contentTypes['census-building-permits'],
    },
    invalid: {
      body: "not-permits",
      contentType: contentTypes['census-building-permits'],
      expectedError: "CSV is missing Survey or FIPS header fields",
    },
  },
  'water-quality-portal': {
    valid: {
      body: validBodies['water-quality-portal'],
      contentType: contentTypes['water-quality-portal'],
    },
    invalid: {
      body: "bad,csv\n",
      contentType: contentTypes['water-quality-portal'],
      expectedError: "CSV is missing MonitoringLocationIdentifier, CharacteristicName, or ResultMeasureValue",
    },
  },
  'eur-lex-cellar': {
    valid: {
      body: validBodies['eur-lex-cellar'],
      contentType: contentTypes['eur-lex-cellar'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['eur-lex-cellar'],
      expectedError: /response contract mismatch/,
    },
  },
  'cms-open-payments': {
    valid: {
      body: validBodies['cms-open-payments'],
      contentType: contentTypes['cms-open-payments'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['cms-open-payments'],
      expectedError: /response contract mismatch/,
    },
  },
  'deps-dev-package-graph': {
    valid: {
      body: validBodies['deps-dev-package-graph'],
      contentType: contentTypes['deps-dev-package-graph'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['deps-dev-package-graph'],
      expectedError: /response contract mismatch/,
    },
  },
  'first-epss': {
    valid: {
      body: validBodies['first-epss'],
      contentType: contentTypes['first-epss'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['first-epss'],
      expectedError: /response contract mismatch/,
    },
  },
  'openssf-scorecard': {
    valid: {
      body: validBodies['openssf-scorecard'],
      contentType: contentTypes['openssf-scorecard'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['openssf-scorecard'],
      expectedError: /response contract mismatch/,
    },
  },
  'legislation-gov-uk': {
    valid: {
      body: validBodies['legislation-gov-uk'],
      contentType: contentTypes['legislation-gov-uk'],
    },
    invalid: {
      body: "<html></html>",
      contentType: contentTypes['legislation-gov-uk'],
      expectedError: "XML is missing legislation markup",
    },
  },
  'uk-police-street-crime': {
    valid: {
      body: validBodies['uk-police-street-crime'],
      contentType: contentTypes['uk-police-street-crime'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['uk-police-street-crime'],
      expectedError: /response contract mismatch/,
    },
  },
  'gleif-lei': {
    valid: {
      body: validBodies['gleif-lei'],
      contentType: contentTypes['gleif-lei'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['gleif-lei'],
      expectedError: /response contract mismatch/,
    },
  },
  'fdic-bank-find': {
    valid: {
      body: validBodies['fdic-bank-find'],
      contentType: contentTypes['fdic-bank-find'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['fdic-bank-find'],
      expectedError: /response contract mismatch/,
    },
  },
  'cftc-commitment-of-traders': {
    valid: {
      body: validBodies['cftc-commitment-of-traders'],
      contentType: contentTypes['cftc-commitment-of-traders'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['cftc-commitment-of-traders'],
      expectedError: /response contract mismatch/,
    },
  },
  'ecb-statistical-data-warehouse': {
    valid: {
      body: validBodies['ecb-statistical-data-warehouse'],
      contentType: contentTypes['ecb-statistical-data-warehouse'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['ecb-statistical-data-warehouse'],
      expectedError: /response contract mismatch/,
    },
  },
  'open-food-facts': {
    valid: {
      body: validBodies['open-food-facts'],
      contentType: contentTypes['open-food-facts'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['open-food-facts'],
      expectedError: /response contract mismatch/,
    },
  },
  'cms-nursing-homes': {
    valid: {
      body: validBodies['cms-nursing-homes'],
      contentType: contentTypes['cms-nursing-homes'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['cms-nursing-homes'],
      expectedError: /response contract mismatch/,
    },
  },
  'who-gho-indicators': {
    valid: {
      body: validBodies['who-gho-indicators'],
      contentType: contentTypes['who-gho-indicators'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['who-gho-indicators'],
      expectedError: /response contract mismatch/,
    },
  },
  'wikidata-query': {
    valid: {
      body: validBodies['wikidata-query'],
      contentType: contentTypes['wikidata-query'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['wikidata-query'],
      expectedError: /response contract mismatch/,
    },
  },
  'met-norway-locationforecast': {
    valid: {
      body: validBodies['met-norway-locationforecast'],
      contentType: contentTypes['met-norway-locationforecast'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['met-norway-locationforecast'],
      expectedError: /response contract mismatch/,
    },
  },
  'osm-overpass': {
    valid: {
      body: validBodies['osm-overpass'],
      contentType: contentTypes['osm-overpass'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['osm-overpass'],
      expectedError: /response contract mismatch/,
    },
  },
  'ourairports': {
    valid: {
      body: validBodies['ourairports'],
      contentType: contentTypes['ourairports'],
    },
    invalid: {
      body: "not-airports",
      contentType: contentTypes['ourairports'],
      expectedError: "CSV is missing ident, type, name, or latitude_deg",
    },
  },
  'nsf-awards': {
    valid: {
      body: validBodies['nsf-awards'],
      contentType: contentTypes['nsf-awards'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['nsf-awards'],
      expectedError: /response contract mismatch/,
    },
  },
  'treasury-debt-to-the-penny': {
    valid: {
      body: validBodies['treasury-debt-to-the-penny'],
      contentType: contentTypes['treasury-debt-to-the-penny'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['treasury-debt-to-the-penny'],
      expectedError: /response contract mismatch/,
    },
  },
  'noaa-gml-co2': {
    valid: {
      body: validBodies['noaa-gml-co2'],
      contentType: contentTypes['noaa-gml-co2'],
    },
    invalid: {
      body: "not-co2",
      contentType: contentTypes['noaa-gml-co2'],
      expectedError: "CSV is missing year or average columns",
    },
  },
  'pubchem-compounds': {
    valid: {
      body: validBodies['pubchem-compounds'],
      contentType: contentTypes['pubchem-compounds'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['pubchem-compounds'],
      expectedError: /response contract mismatch/,
    },
  },
  'dailymed-drug-labels': {
    valid: {
      body: validBodies['dailymed-drug-labels'],
      contentType: contentTypes['dailymed-drug-labels'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['dailymed-drug-labels'],
      expectedError: /response contract mismatch/,
    },
  },
  'openfda-device-events': {
    valid: {
      body: validBodies['openfda-device-events'],
      contentType: contentTypes['openfda-device-events'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['openfda-device-events'],
      expectedError: /response contract mismatch/,
    },
  },
  'fema-nfip-redacted-claims': {
    valid: {
      body: validBodies['fema-nfip-redacted-claims'],
      contentType: contentTypes['fema-nfip-redacted-claims'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['fema-nfip-redacted-claims'],
      expectedError: /response contract mismatch/,
    },
  },
  'ripe-stat': {
    valid: {
      body: validBodies['ripe-stat'],
      contentType: contentTypes['ripe-stat'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['ripe-stat'],
      expectedError: /response contract mismatch/,
    },
  },
  'nchs-provisional-mortality': {
    valid: {
      body: validBodies['nchs-provisional-mortality'],
      contentType: contentTypes['nchs-provisional-mortality'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['nchs-provisional-mortality'],
      expectedError: /response contract mismatch/,
    },
  },
  'noaa-ndbc-buoys': {
    valid: {
      body: validBodies['noaa-ndbc-buoys'],
      contentType: contentTypes['noaa-ndbc-buoys'],
    },
    invalid: {
      body: "no sensors",
      contentType: contentTypes['noaa-ndbc-buoys'],
      expectedError: "buoy file is missing WSPD or WVHT",
    },
  },
  'ons-statistics': {
    valid: {
      body: validBodies['ons-statistics'],
      contentType: contentTypes['ons-statistics'],
    },
    invalid: {
      body: "{}",
      contentType: contentTypes['ons-statistics'],
      expectedError: /response contract mismatch/,
    },
  },
} satisfies {
  [K in keyof typeof contractDefinitions]: {
    valid: ProviderFixture;
    invalid: ProviderFixture & { expectedError: string | RegExp };
  };
};

export function attachContractFixtures<
  T extends Record<string, ProviderContractDefinition>,
>(
  definitions: T,
  attached: {
    [K in keyof T]: {
      valid: ProviderFixture;
      invalid: ProviderFixture & { expectedError: string | RegExp };
    };
  },
): { [K in keyof T]: ProviderContract } {
  return Object.fromEntries(
    (Object.keys(definitions) as Array<keyof T>).map((id) => {
      const fixture = attached[id];
      if (!fixture) {
        throw new Error(`missing provider fixtures for ${String(id)}`);
      }
      return [id, { ...definitions[id], ...fixture }];
    }),
  ) as unknown as { [K in keyof T]: ProviderContract };
}

export const providerContracts = attachContractFixtures(contractDefinitions, fixtures);

export function hasProviderContract(datasetId: string): datasetId is keyof typeof providerContracts {
  return Object.hasOwn(providerContracts, datasetId);
}

export function getProviderContract(datasetId: string): ProviderContract | undefined {
  return hasProviderContract(datasetId) ? providerContracts[datasetId] : undefined;
}
