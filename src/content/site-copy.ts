import type { Dataset, DatasetTheme } from "@/lib/schema";

export const siteCopy = {
  name: "Trilemma Data",
  productLabel: "Data",
  foundationName: "Trilemma Foundation",
  foundationAriaLabel: "Trilemma Foundation main website",
  primaryNavigationLabel: "Primary",
  mobileNavigationLabel: "Mobile primary",
  datasetsNavigationLabel: "Datasets",
  collectionsNavigationLabel: "Build paths",
  contributeLabel: "Contribute",
  compareLabel: "Compare",
  feedbackLabel: "Send feedback",
  foundationLinksLabel: "Foundation",
  foundationHomeLabel: "Home",
  projectsLabel: "Projects",
  tournamentsLabel: "Tournaments",
  teamLabel: "Team",
  charterLabel: "Charter",
  privacyLabel: "Privacy Policy",
  termsLabel: "Participation Terms",
  footerDataNavigationLabel: "Data links",
  footerFoundationNavigationLabel: "Foundation links",
  footerLegalNavigationLabel: "Legal links",
  openNavigationLabel: "Open navigation",
  closeNavigationLabel: "Close navigation",
  skipLinkLabel: "Skip to content",
  hostLabel: "data.trilemma.foundation",
  metadataDescription:
    "Choose a maintained dataset and a first project you can actually build. Guides, Python examples, and source terms stay attached to every record.",
  footerSummary:
    "Curated build paths and authoritative sources for focused microproducts. Trilemma links to source data; it does not host or relicense it.",
  copyright: (year: number) =>
    `© ${year} Trilemma Foundation. All rights reserved.`,
} as const;

export const catalogCopy = {
  heroTitle: "Choose a Dataset. Build a Microproduct.",
  heroTrust: (count: number, verified: string) =>
    `${count} actively maintained guides. Oldest source review ${verified}.`,
  searchLabel: "Search by topic, provider, or product use",
  searchPlaceholder: "Try “weather” or “filings”",
  recommendedDatasetId: "nws-weather-api",
  starterCollectionId: "first-builds",
  catalogEyebrow: "Dataset catalog",
  buildPathsTitle: "Start from a build path",
  buildPathsDescription:
    "Opinionated collections for a first prototype. Each path names the job, not just the domain.",
  firstBuildsTitle: "Good first builds",
  firstBuildsDescription:
    "Beginner, no-key sources with a first project you can finish without paid infrastructure.",
  catalogSectionTitle: "Browse the full catalog",
  viewCollectionLabel: "Open path",
  datasetCount: (count: number) => `${count} dataset${count === 1 ? "" : "s"}`,
  activeFiltersAriaLabel: "Active filters",
  noApiKeyChipLabel: "No API key",
  emptyTitle: "No datasets match those filters",
  emptyDescription: "Broaden your search or remove a filter to see more sources.",
  clearFiltersLabel: "Clear filters",
  drawerTitle: "Filter datasets",
  drawerDescription:
    "Refine the catalog by theme, difficulty, access, type, domain, task, size, format, and geography.",
  closeFiltersLabel: "Close filters",
  resultCount: (count: number) => `${count} dataset${count === 1 ? "" : "s"}`,
  resultStatus: (count: number) =>
    `${catalogCopy.resultCount(count)} found`,
  paginationLabel: "Dataset catalog pages",
  previousPageLabel: "Previous",
  nextPageLabel: "Next",
  pageLabel: (page: number) => `Page ${page}`,
  pageSummary: (page: number, totalPages: number, start: number, end: number) =>
    start === end
      ? `Page ${page} of ${totalPages}`
      : `Page ${page} of ${totalPages} · Showing ${start}–${end}`,
  pageStatus: (page: number, totalPages: number, start: number, end: number, total: number) =>
    start === end
      ? `Page ${page} of ${totalPages}, showing ${start} of ${total} datasets.`
      : `Page ${page} of ${totalPages}, showing ${start}–${end} of ${total} datasets.`,
  showResults: (count: number) => `Show ${catalogCopy.resultCount(count)}`,
  removeFilter: (label: string) => `Remove ${label} filter`,
} as const;

export const filterChipPrefixes = {
  query: "Search",
  theme: "Theme",
  accessMethod: "Access",
  domains: "Domain",
  dataTypes: "Type",
  tasks: "Task",
  difficulty: "Level",
  sizes: "Size",
  formats: "Format",
  geographies: "Place",
} as const;

export const filterCopy = {
  clearAllLabel: "Clear all",
  difficultyLabel: "Difficulty",
  allDifficultiesLabel: "All levels",
  themeLabel: "Theme",
  allThemesLabel: "All themes",
  accessMethodLabel: "Access method",
  accessMethodShortLabel: "Access",
  allAccessMethodsLabel: "Any method",
  dataTypeLabel: "Data type",
  domainLabel: "Domain",
  taskLabel: "Task",
  moreFiltersLabel: "More filters",
  advancedFiltersLabel: "Advanced filters",
  sizeLabel: "Size",
  formatLabel: "Format",
  apiKeyLabel: "API key required",
  apiKeyShortLabel: "API key",
  anyApiKeyLabel: "Any key",
  yesLabel: "Yes",
  noLabel: "No",
  geographyLabel: "Geography",
} as const;

export const tableCopy = {
  caption: "Compare available datasets",
  datasetLabel: "Dataset",
  themeLabel: "Theme",
  accessLabel: "Access",
  formatsLabel: "Formats",
  difficultyLabel: "Difficulty",
  updatesLabel: "Updates",
  freeKeyLabel: "Key",
  noKeyLabel: "No key",
  accessApiLabel: "API",
  accessDownloadLabel: "Download",
  accessBothLabel: "API+DL",
  themeShort: {
    "Environment & Hazards": "Environment",
    "Government & Policy": "Government",
    "Markets & Economics": "Markets",
    "Health, Food & Safety": "Health",
    "Geospatial & Infrastructure": "Geospatial",
    "Research & Reference": "Research",
    "Technology & Cybersecurity": "Technology",
    "Demographics & Development": "Demographics",
  } satisfies Record<DatasetTheme, string>,
  moreFormats: (count: number) => `${count} more format${count === 1 ? "" : "s"}`,
  sortBy: (column: string, current: false | "asc" | "desc") =>
    current === "asc"
      ? `Sort ${column} descending`
      : current === "desc"
        ? `Restore default order`
        : `Sort ${column} ascending`,
} as const;

export const datasetCardCopy = {
  goodFirstBuildLabel: "Good first build",
  apiKeyRequiredLabel: "Free API key required",
  noApiKeyLabel: "No API key required",
  viewGuideLabel: "View guide",
  firstProjectLabel: "First project",
  apiKeyStatus: (required: boolean) =>
    required
      ? datasetCardCopy.apiKeyRequiredLabel
      : datasetCardCopy.noApiKeyLabel,
} as const;

export const accessTypeLabels: Record<
  Dataset["access_type"][number],
  string
> = {
  download: "Download",
  api: "API",
  both: "Download and API",
};

export const difficultyDescriptions: Record<Dataset["difficulty"], string> = {
  beginner: "Beginner — comfortable for a first prototype",
  intermediate: "Intermediate — some data preparation helps",
  advanced: "Advanced — expect specialized tools or domain knowledge",
};

export const datasetGuideCopy = {
  breadcrumbAriaLabel: "Breadcrumb",
  guideEyebrow: "Microproduct data guide",
  startGuideLabel: "Start the guide",
  officialSourceLabel: "Open official source",
  atAGlanceTitle: "At a glance",
  factLabels: {
    difficulty: "Difficulty",
    size: "Size",
    formats: "Formats",
    access: "Access",
    apiKey: "API key",
    provider: "Provider",
    updates: "Updates",
    dataTerms: "Data terms",
    verified: "Last verified",
    sourceType: "Source type",
    friction: "Setup friction",
    setupMinutes: "Setup time",
    sampleSize: "First sample",
    registration: "Registration",
    rateLimits: "Rate limits",
  },
  apiKeyRequiredLabel: "Required",
  apiKeyNotRequiredLabel: "Not required",
  registrationRequiredLabel: "Required",
  registrationNotRequiredLabel: "Not required",
  setupMinutes: (minutes: number) => `${minutes} min`,
  pythonSyntaxLabel: "Python syntax checked",
  notebookLabel: "Runnable notebook",
  runtimeVerifiedLabel: (date: string) => `Runtime verified ${date}`,
  expectedOutputTitle: "Expected output",
  relatedTitle: "Related datasets",
  colabLabel: "Open in Colab",
  feedbackLabel: "Report a problem",
  addToShortlistLabel: "Add to shortlist",
  removeFromShortlistLabel: "Remove from shortlist",
  compareLabel: "Compare",
  replacementLabel: "See replacement",
  statusUntilLabel: (date: string) => `Listed until ${date}`,
  accessTypes: (types: Dataset["access_type"]) =>
    types.map((type) => accessTypeLabels[type]).join(" or "),
  beginnerGuideEyebrow: "From source to product signal",
  guideTitle: "Test a product idea in four steps",
  setupTitle: "Check the setup",
  accessTitle: "Access the data",
  pythonTitle: "Run the Python example",
  pythonDescription: "Install the packages, then run the notebook cell.",
  pythonExampleAriaLabel: "Python example",
  firstProjectEyebrow: "Test a useful signal",
  detailsTitle: "Dataset details",
  conceptLabels: {
    theme: "Theme",
    domains: "Domains",
    dataTypes: "Data types",
    tasks: "Tasks",
    geography: "Geography",
  },
  detailsSummary: ({
    provider,
    sourceType,
    lastVerified,
    temporalCoverage,
  }: {
    provider: string;
    sourceType: Dataset["source_type"];
    lastVerified: string;
    temporalCoverage: string | null;
  }) => {
    const article = /^[aeiou]/i.test(sourceType) ? "an" : "a";
    return `${provider} is ${article} ${sourceType} source. Last verified ${lastVerified}. Temporal coverage: ${temporalCoverage ?? "not applicable"}.`;
  },
} as const;

export const themeLandingCopy: Record<
  DatasetTheme,
  { summary: string; outcome: string }
> = {
  "Environment & Hazards": {
    summary:
      "Official weather, hazard, and environmental feeds for alerts, local planning, and operational monitors.",
    outcome:
      "Start with a bounded place and one signal, then decide whether the product needs a watch, a map, or a status board.",
  },
  "Government & Policy": {
    summary:
      "Primary legal, spending, and screening sources for watching rules, filings, and public decisions as they change.",
    outcome:
      "Use these guides to prototype a docket watcher, a sanctions screen, or a legislative brief without scraping.",
  },
  "Markets & Economics": {
    summary:
      "Public market, price, and macroeconomic series for comparing places, sizing demand, or tracking a shock.",
    outcome:
      "Pick one series, keep the retrieval timestamp, and test whether the movement would change a product decision.",
  },
  "Health, Food & Safety": {
    summary:
      "Surveillance, inspection, and product-safety sources for health monitors and recall-aware prototypes.",
    outcome:
      "Start with a small geography or product class and interpret provisional counts before automating an alert.",
  },
  "Geospatial & Infrastructure": {
    summary:
      "Places, networks, and built-environment layers for siting, coverage, and infrastructure prototypes.",
    outcome:
      "Join one local boundary to a maintained layer and check whether the result is useful at neighborhood scale.",
  },
  "Research & Reference": {
    summary:
      "Scholarly, bibliographic, and reference metadata for topic alerts and research discovery tools.",
    outcome:
      "Follow citations or page activity for one topic and keep the source record attached to every result.",
  },
  "Technology & Cybersecurity": {
    summary:
      "Vulnerability, package, and internet-measurement sources for security monitors and dependency watchers.",
    outcome:
      "Track one asset class, keep the first-seen timestamp, and avoid treating a feed as a complete inventory.",
  },
  "Demographics & Development": {
    summary:
      "Population, development, and community statistics for comparing places and scoping who a product serves.",
    outcome:
      "Choose one geography and one indicator, then document the vintage before using it in a planning tool.",
  },
};

export const collectionsCopy = {
  title: "Build paths",
  description:
    "Curated starting points for a first microproduct. Each path is reviewed independently of ordinary dataset additions.",
  catalogLinkLabel: "Browse matching catalog filters",
  browseThemeLabel: "Browse this theme in the catalog",
  foundationLinkLabel: "Related Foundation work",
  updatedLabel: (date: string) => `Reviewed ${date}`,
  curatorLabel: (curator: string) => `Curated by ${curator}`,
} as const;

export const shortlistCopy = {
  barLabel: "Shortlist",
  emptyLabel: "Shortlist is empty",
  countLabel: (count: number) =>
    `${count} dataset${count === 1 ? "" : "s"} shortlisted`,
  compareLabel: "Compare selected",
  clearLabel: "Clear shortlist",
  addLabel: "Add to shortlist",
  removeLabel: "Remove from shortlist",
  fullLabel: "Shortlist is full",
} as const;

export const compareCopy = {
  title: "Compare datasets",
  description:
    "Compare two or three maintained sources side by side. Share the URL, or start from your local shortlist.",
  emptyTitle: "Choose two or three datasets",
  emptyDescription:
    "Add datasets to your shortlist or open this page with an ids query such as ?ids=nws-weather-api,usgs-earthquakes.",
  oneTitle: "Add one more dataset",
  oneDescription: "Comparison needs two or three valid active datasets.",
  invalidTitle: "Those ids cannot be compared",
  invalidDescription:
    "Unknown, duplicate, or inactive ids are ignored. Use active catalog datasets only.",
  openGuideLabel: "Open guide",
  fieldLabels: {
    difficulty: "Difficulty",
    firstBuild: "First build",
    access: "Access",
    apiKey: "API key",
    formats: "Formats",
    updates: "Update frequency",
    verified: "Last verified",
    friction: "Setup friction",
    setup: "Setup time",
    sample: "Sample size",
    source: "Official source",
  },
} as const;

export const contributeCopy = {
  title: "Contribution studio",
  description:
    "Draft a dataset YAML file with the same schema and guide-copy rules used in CI. Download the file and open a GitHub pull request. This page does not execute Python or create a pull request.",
  yamlLabel: "Dataset YAML",
  previewLabel: "Guide preview",
  errorsLabel: "Validation issues",
  downloadLabel: "Download YAML",
  copyYamlLabel: "Copy YAML",
  copiedYamlLabel: "YAML copied",
  githubLabel: "Open contribution guide",
  pythonNotice:
    "Python syntax, live URL, and provider checks still run in repository CI. This studio never executes submitted code.",
  emptyPreview: "Fix validation issues to preview the guide.",
  loadExampleLabel: "Load template",
} as const;

export const copyButtonCopy = {
  idleLabel: "Copy Python",
  copiedLabel: "Copied",
  errorLabel: "Try again",
  copiedAnnouncement: "Python code copied to clipboard.",
  errorAnnouncement: "Copy failed. Select the code and copy it manually.",
} as const;

export const notFoundCopy = {
  eyebrow: "404",
  title: "Page not found",
  description: "This page is not available. Browse the catalog to find a maintained dataset.",
  backLabel: "Back to datasets",
} as const;
