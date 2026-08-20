import { isChicagoTitleCase, toChicagoTitleCase } from "./chicago-title-case";
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
const CREDENTIAL_ASSIGNMENT =
  /\b(?:api[_-]?key|password|secret|token)\s*=\s*["'](?!YOUR|REPLACE|<)[^"']{12,}["']/i;

function words(value: string): string[] {
  return value.trim().split(/\s+/).filter(Boolean);
}

function sentenceCount(value: string): number {
  let normalized = value.trim();
  for (const abbreviation of ABBREVIATIONS) {
    normalized = normalized.replace(abbreviation, "ABBR");
  }
  const withoutTerminal = normalized.endsWith(".")
    ? normalized.slice(0, -1)
    : normalized;
  return withoutTerminal
    .split(/\.\s+/)
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

function pythonUsesSource(dataset: Dataset): boolean {
  const code = dataset.getting_started.python.code;
  if (/https:\/\//i.test(code)) return true;
  if (!includesDownload(dataset.access_type)) return false;
  if (!LOCAL_READ.test(code)) return false;
  return dataset.getting_started.access_steps.some((step) =>
    /\bdownload\b/i.test(step),
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

  if (CREDENTIAL_ASSIGNMENT.test(dataset.getting_started.python.code)) {
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
