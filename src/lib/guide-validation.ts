import { isChicagoTitleCase, toChicagoTitleCase } from "./chicago-title-case";
import { getProviderContract } from "./provider-contracts";
import type { Dataset } from "./schema";

export const MIN_DESCRIPTION_WORDS = 12;
export const MIN_MARKER_LENGTH = 16;

const ABBREVIATIONS = [/\bU\.S\./g, /\bU\.K\./g, /\be\.g\./gi, /\bi\.e\./gi];

export const OVERVIEW_SCOPE_SIGNALS = [
  /start with/i,
  /start by/i,
  /\bsmallest\b/i,
  /\bbounded\b/i,
  /\bone /i,
  /\ba few /i,
] as const;

export const OVERVIEW_LIMITATION_SIGNALS = [
  /\bmissing\b/i,
  /\bnot /i,
  /\bnot\b/i,
  /\bcannot\b/i,
  /\bdo not\b/i,
  /\bdon't\b/i,
  /\bshould not\b/i,
  /\blimit/i,
  /\bprovisional\b/i,
  /\bcoverage\b/i,
  /\brevision/i,
  /\buncertainty\b/i,
  /\baggregat/i,
  /\bgeneralized\b/i,
  /\bsyndromic\b/i,
  /\bnot authoritative\b/i,
  /\bestimate/i,
  /\bmodel/i,
  /\bsample\b/i,
  /\bdelay/i,
  /\blag\b/i,
  /\bprivacy\b/i,
  /\bsuppress/i,
  /\bcoarse\b/i,
  /\bincomplete\b/i,
  /\bunverified\b/i,
  /\bdoes not\b/i,
  /\bmay not\b/i,
  /\bwithout\b/i,
  /\bdepends on\b/i,
  /\bonly\b/i,
  /\bmust be\b/i,
  /\bdiffer\b/i,
  /\bcan be\b/i,
  /\bbefore\b/i,
  /\bno [a-z]/i,
  /\bamended\b/i,
] as const;

export const FIRST_PROJECT_LIMITATION_SIGNALS = [
  /\bexplain\b/i,
  /\binterpret/i,
  /\blimitation\b/i,
  /\bwhy\b/i,
  /\bcannot\b/i,
  /\bdo not\b/i,
  /\bdon't\b/i,
  /\bmissing\b/i,
  /\buncertainty\b/i,
  /\bnot a\b/i,
  /\bprevent\b/i,
  /\bdiffer\b/i,
  /\bnote that\b/i,
  /\battribute\b/i,
  /\bshould not\b/i,
  /\btreat/i,
  /\bbefore\b/i,
  /\brequire\b/i,
  /\bnot\b/i,
  /\bstate that\b/i,
] as const;

export const ACCESS_STEP_VERBS = [
  "accept",
  "agree",
  "apply",
  "assign",
  "attach",
  "authenticate",
  "avoid",
  "browse",
  "build",
  "call",
  "capture",
  "check",
  "choose",
  "cite",
  "clone",
  "collect",
  "compare",
  "complete",
  "compute",
  "confirm",
  "continue",
  "convert",
  "copy",
  "count",
  "create",
  "describe",
  "distinguish",
  "document",
  "download",
  "drop",
  "enable",
  "enter",
  "exclude",
  "explain",
  "export",
  "extract",
  "fetch",
  "filter",
  "find",
  "finish",
  "follow",
  "get",
  "identify",
  "import",
  "include",
  "inspect",
  "install",
  "join",
  "keep",
  "label",
  "limit",
  "link",
  "list",
  "load",
  "locate",
  "log",
  "login",
  "map",
  "match",
  "measure",
  "merge",
  "navigate",
  "note",
  "obtain",
  "open",
  "parse",
  "paste",
  "pick",
  "plot",
  "point",
  "post",
  "preserve",
  "print",
  "pull",
  "query",
  "read",
  "record",
  "register",
  "repeat",
  "replace",
  "request",
  "restrict",
  "retain",
  "retrieve",
  "review",
  "run",
  "save",
  "search",
  "select",
  "send",
  "set",
  "sign",
  "sort",
  "split",
  "start",
  "stay",
  "store",
  "stream",
  "submit",
  "summarize",
  "take",
  "test",
  "trim",
  "try",
  "unzip",
  "update",
  "use",
  "validate",
  "verify",
  "visit",
  "wait",
  "write",
] as const;

const ACCESS_STEP_VERB_SET = new Set<string>(ACCESS_STEP_VERBS);

export const REJECTED_ACCESS_STEP_STARTERS = ["the", "a", "an", "this", "these"] as const;

export const GENERIC_PAGE_MARKERS = [
  "cc0",
  "daily api",
  "download api",
  "getting started",
  "open data",
  "public domain",
  "recalls",
  "terms of service",
] as const;

const GENERIC_PAGE_MARKER_SET = new Set<string>(GENERIC_PAGE_MARKERS);

const LOCAL_READ = /\b(read_csv|read_file|read_parquet|read_excel)\s*\(/;
const CREDENTIAL_VALUE_PATTERNS = [
  /(?:\b(?:api[_-]?key|password|secret|token)\b|["'](?:api[_-]?key|password|secret|token)["'])\s*(?:=|:)\s*["']([^"']+)["']/gi,
  /["'](?:authorization|x-api-key|api-key)["']\s*:\s*["']([^"'{}]+)["']/gi,
  /\[\s*["'](?:authorization|x-api-key|api-key)["']\s*\]\s*=\s*["']([^"'{}]+)["']/gi,
  /[?&](?:api[_-]?key|password|secret|token)=([^&"'\s]+)/gi,
] as const;
const MULTI_LABEL_PUBLIC_SUFFIXES = new Set([
  "ac.uk",
  "co.uk",
  "gov.uk",
  "org.uk",
  "com.au",
  "gov.au",
  "org.au",
  "co.nz",
  "govt.nz",
  "gc.ca",
]);
const SOURCE_HOST_EXCEPTIONS: Partial<Record<string, readonly string[]>> = {
  "certificate-transparency-crtsh": ["crt.sh"],
  "chrome-ux-report": ["chromeuxreport.googleapis.com"],
  "college-scorecard": ["api.data.gov"],
  "fbi-crime-data-explorer": ["api.usa.gov"],
  "hmda-loan-applications": ["ffiec.cfpb.gov"],
  "medsl-county-returns": ["dataverse.harvard.edu"],
  "mitre-attack-enterprise": ["raw.githubusercontent.com"],
  "nhtsa-fars": ["crashviewer.nhtsa.dot.gov"],
  "overture-maps-places": ["overturemapswestus2.blob.core.windows.net"],
  "regulations-gov-dockets": ["api.regulations.gov"],
  "sam-gov-contract-opportunities": ["api.sam.gov"],
  "un-comtrade": ["comtradeplus.un.org"],
};

function words(value: string): string[] {
  return value.trim().split(/\s+/).filter(Boolean);
}

function sentenceCount(value: string): number {
  let normalized = value.trim();
  for (const abbreviation of ABBREVIATIONS) {
    normalized = normalized.replace(abbreviation, "ABBR");
  }
  const withoutTerminal = /[.!?]$/.test(normalized)
    ? normalized.slice(0, -1)
    : normalized;
  return withoutTerminal
    .split(/[.!?]\s+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

function matchesAny(value: string, signals: readonly RegExp[]): boolean {
  return signals.some((signal) => signal.test(value));
}

function includesDownload(accessType: Dataset["access_type"]): boolean {
  return accessType.includes("download") || accessType.includes("both");
}

function firstToken(step: string): string {
  const match = step.trim().match(/^([A-Za-z']+)/);
  return match?.[1]?.toLocaleLowerCase("en-US") ?? "";
}

function isCredentialPlaceholder(value: string): boolean {
  const normalized = value.trim().replace(/^Bearer\s+/i, "").toLocaleUpperCase("en-US");
  return (
    /^(?:YOUR|REPLACE|CHANGE|INSERT)(?:_|-|\b)/.test(normalized) ||
    normalized.startsWith("<") ||
    /^X{6,}$/.test(normalized)
  );
}

function pythonEmbedsCredential(code: string): boolean {
  for (const pattern of CREDENTIAL_VALUE_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of code.matchAll(pattern)) {
      const value = match[1]!.trim().replace(/^Bearer\s+/i, "");
      if (value.length >= 12 && !isCredentialPlaceholder(value)) return true;
    }
  }
  return false;
}

function registrableDomain(hostname: string): string {
  const parts = hostname.toLocaleLowerCase("en-US").replace(/^www\./, "").split(".");
  if (parts.length <= 2) return parts.join(".");
  const suffix = parts.slice(-2).join(".");
  return MULTI_LABEL_PUBLIC_SUFFIXES.has(suffix)
    ? parts.slice(-3).join(".")
    : suffix;
}

function hostsAreRelated(left: string, right: string): boolean {
  const a = left.toLocaleLowerCase("en-US").replace(/^www\./, "");
  const b = right.toLocaleLowerCase("en-US").replace(/^www\./, "");
  return (
    a === b ||
    a.endsWith(`.${b}`) ||
    b.endsWith(`.${a}`) ||
    registrableDomain(a) === registrableDomain(b)
  );
}

function pythonSourceUrls(code: string): URL[] {
  return code.split("\n").flatMap((line) => {
    const trimmed = line.trim();
    if (
      trimmed.startsWith("#") ||
      /["']User-Agent["']\s*:/.test(line) ||
      /^\s*(?:json|data|payload)\s*=/.test(line)
    ) {
      return [];
    }
    return [...line.matchAll(/https:\/\/[^\s"'<>)}\]]+/g)].flatMap((match) => {
      try {
        const url = new URL(match[0]!);
        return url.hostname === "data.trilemma.foundation" ? [] : [url];
      } catch {
        return [];
      }
    });
  });
}

function pythonUsesSource(dataset: Dataset): boolean {
  const code = dataset.getting_started.python.code;
  const sourceUrls = pythonSourceUrls(code);
  if (sourceUrls.length > 0) {
    const acceptedHosts = [
      new URL(dataset.url).hostname,
      ...(getProviderContract(dataset.id)
        ? [new URL(getProviderContract(dataset.id)!.url).hostname]
        : []),
      ...(Object.hasOwn(SOURCE_HOST_EXCEPTIONS, dataset.id)
        ? SOURCE_HOST_EXCEPTIONS[dataset.id]!
        : []),
    ];
    return sourceUrls.every((url) =>
      acceptedHosts.some((hostname) => hostsAreRelated(url.hostname, hostname)),
    );
  }
  return (
    includesDownload(dataset.access_type) &&
    LOCAL_READ.test(code) &&
    dataset.getting_started.access_steps.some((step) => /\bdownload\b/i.test(step))
  );
}

function markerError(field: "source_marker" | "license_marker"): string {
  return `url_checks.${field} must be at least ${MIN_MARKER_LENGTH} characters and page-specific`;
}

function validateMarker(value: string, field: "source_marker" | "license_marker"): string[] {
  const normalized = value.trim().toLocaleLowerCase("en-US");
  if (value.trim().length < MIN_MARKER_LENGTH || GENERIC_PAGE_MARKER_SET.has(normalized)) {
    return [markerError(field)];
  }
  return [];
}

export function validateGuideCopy(dataset: Dataset): string[] {
  const messages: string[] = [];
  if (!isChicagoTitleCase(dataset.name)) {
    messages.push(
      `name must use Chicago Title Case ("${toChicagoTitleCase(dataset.name)}")`,
    );
  }

  if (!isChicagoTitleCase(dataset.getting_started.first_project.title)) {
    messages.push(
      `getting_started.first_project.title must use Chicago Title Case ("${toChicagoTitleCase(dataset.getting_started.first_project.title)}")`,
    );
  }

  const description = dataset.description.trim();
  const overview = dataset.getting_started.overview.trim();
  const lastStep =
    dataset.getting_started.first_project.steps.at(-1)?.trim() ?? "";

  const sentences = sentenceCount(description);
  if (!description.endsWith(".") || sentences !== 1) {
    messages.push("description must be one sentence ending with a period");
  }

  if (words(description).length < MIN_DESCRIPTION_WORDS) {
    messages.push(`description must contain at least ${MIN_DESCRIPTION_WORDS} words`);
  }

  if (!/\bfor\b/i.test(description)) {
    messages.push(
      'description must include a "for" clause naming a product, decision, or workflow',
    );
  }

  if (!matchesAny(overview, OVERVIEW_SCOPE_SIGNALS)) {
    messages.push("getting_started.overview must identify a smallest starting scope");
  }

  if (!matchesAny(overview, OVERVIEW_LIMITATION_SIGNALS)) {
    messages.push("getting_started.overview must state an interpretation limitation");
  }

  dataset.getting_started.access_steps.forEach((step, index) => {
    const token = firstToken(step);
    if (
      !token ||
      REJECTED_ACCESS_STEP_STARTERS.includes(
        token as (typeof REJECTED_ACCESS_STEP_STARTERS)[number],
      ) ||
      !ACCESS_STEP_VERB_SET.has(token)
    ) {
      messages.push(
        `getting_started.access_steps[${index}] must start with an imperative verb`,
      );
    }
  });

  if (pythonEmbedsCredential(dataset.getting_started.python.code)) {
    messages.push("getting_started.python.code must not embed credentials");
  }

  if (!pythonUsesSource(dataset)) {
    messages.push(
      "getting_started.python.code must use the authoritative source (https URL or a local file after a download step)",
    );
  }

  if (!matchesAny(lastStep, FIRST_PROJECT_LIMITATION_SIGNALS)) {
    messages.push(
      "getting_started.first_project.steps must end with an interpretation or limitation",
    );
  }

  messages.push(
    ...validateMarker(dataset.url_checks.source_marker, "source_marker"),
    ...validateMarker(dataset.url_checks.license_marker, "license_marker"),
  );

  if (
    dataset.url !== dataset.license_url &&
    dataset.url_checks.source_marker.trim().toLocaleLowerCase("en-US") ===
      dataset.url_checks.license_marker.trim().toLocaleLowerCase("en-US")
  ) {
    messages.push(
      "url_checks.source_marker and license_marker must differ when source and license URLs differ",
    );
  }

  return messages;
}
