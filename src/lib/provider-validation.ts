import { z } from "zod";
import {
  closePinnedAgents,
  fetchPinnedHttps,
  readBoundedBody,
  VALIDATOR_USER_AGENT,
  type ResolveHost,
} from "./http-validation";
import { mapPool } from "./async-pool";
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
  concurrency?: number;
  resolveHost?: ResolveHost;
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
  if (!Object.hasOwn(contracts, datasetId)) {
    return [`no provider contract is defined for ${datasetId}`];
  }
  const contract = contracts[datasetId as keyof typeof contracts];

  const agents = new Map();

  async function request() {
    const result = await fetchPinnedHttps(contract.url, {
      fetchImpl: options.fetchImpl,
      resolveHost: options.resolveHost,
      timeoutMs: options.timeoutMs ?? TIMEOUT_MS,
      agents,
      headers: {
        Accept: contract.contentTypes.join(", "),
        "User-Agent": VALIDATOR_USER_AGENT,
        ...("range" in contract ? { Range: contract.range } : {}),
      },
    });
    if (result.identityError) return [result.identityError];
    if (!result.response) {
      return [providerRequestFailure(contract.url, result.message)];
    }

    const response = result.response;
    if (!response.ok) return [`provider contract returned HTTP ${response.status}`];

    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_RESPONSE_BYTES) {
      await response.body?.cancel().catch(() => undefined);
      return [`provider response exceeds ${MAX_RESPONSE_BYTES} bytes`];
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contract.contentTypes.some((type) => contentType.startsWith(type))) {
      await response.body?.cancel().catch(() => undefined);
      return [`unexpected provider content type: ${contentType || "missing"}`];
    }

    const body = await readBoundedBody(response, MAX_RESPONSE_BYTES);
    if (!body) {
      return [`provider response exceeds ${MAX_RESPONSE_BYTES} bytes`];
    }

    const validationError = contract.validate(body);
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
  const jobs = datasets.filter((dataset) => Object.hasOwn(contracts, dataset.id));
  const results = await mapPool(jobs, options.concurrency ?? 3, async (dataset) => [
    `${dataset.id}.yaml`,
    await checkProviderContract(dataset.id, options),
  ] as const);
  return new Map(results.filter(([, errors]) => errors.length > 0));
}
