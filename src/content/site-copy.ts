import type { Dataset, DatasetTheme } from "@/lib/schema";

export const siteCopy = {
  name: "Trilemma Data",
  productLabel: "Data",
  foundationName: "Trilemma Foundation",
  foundationAriaLabel: "Trilemma Foundation Main Website",
  primaryNavigationLabel: "Primary",
  mobileNavigationLabel: "Mobile Primary",
  datasetsNavigationLabel: "Datasets",
  collectionsNavigationLabel: "Build Paths",
  contributeLabel: "Contribute",
  feedbackLabel: "Send Feedback",
  foundationLinksLabel: "Foundation",
  foundationHomeLabel: "Home",
  projectsLabel: "Projects",
  tournamentsLabel: "Tournaments",
  teamLabel: "Team",
  charterLabel: "Charter",
  privacyLabel: "Privacy Policy",
  termsLabel: "Participation Terms",
  footerDataNavigationLabel: "Data Links",
  footerFoundationNavigationLabel: "Foundation Links",
  footerLegalNavigationLabel: "Legal Links",
  openNavigationLabel: "Open Navigation",
  closeNavigationLabel: "Close Navigation",
  skipLinkLabel: "Skip to Content",
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
  searchLabel: "Search by Topic, Provider, or Product Use",
  searchPlaceholder: "Try “weather” or “filings”",
  recommendedDatasetId: "nws-weather-api",
  catalogEyebrow: "Dataset Catalog",
  buildPathsTitle: "Start from a Build Path",
  buildPathsDescription:
    "Opinionated collections for a first prototype. Each path names the job, not just the domain.",
  catalogSectionTitle: "Browse the Full Catalog",
  viewCollectionLabel: "Open Path",
  datasetCount: (count: number) => `${count} Dataset${count === 1 ? "" : "s"}`,
  activeFiltersAriaLabel: "Active Filters",
  noApiKeyChipLabel: "No API Key",
  emptyTitle: "No Datasets Match Those Filters",
  emptyDescription: "Broaden your search or remove a filter to see more sources.",
  clearFiltersLabel: "Clear Filters",
  drawerTitle: "Filter Datasets",
  drawerDescription:
    "Refine the catalog by theme, difficulty, access, type, domain, task, size, format, and geography.",
  closeFiltersLabel: "Close Filters",
  resultCount: (count: number) => `${count} Dataset${count === 1 ? "" : "s"}`,
  resultStatus: (count: number) =>
    `${catalogCopy.resultCount(count)} Found`,
  paginationLabel: "Dataset Catalog Pages",
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
  showResults: (count: number) =>
    `Show ${count} Dataset${count === 1 ? "" : "s"}`,
  removeFilter: (label: string) => `Remove ${label} Filter`,
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
  clearAllLabel: "Clear All",
  difficultyLabel: "Difficulty",
  allDifficultiesLabel: "All Levels",
  themeLabel: "Theme",
  allThemesLabel: "All Themes",
  accessMethodLabel: "Access Method",
  accessMethodShortLabel: "Access",
  allAccessMethodsLabel: "Any Method",
  dataTypeLabel: "Data Type",
  domainLabel: "Domain",
  taskLabel: "Task",
  moreFiltersLabel: "More Filters",
  advancedFiltersLabel: "Advanced Filters",
  sizeLabel: "Size",
  formatLabel: "Format",
  apiKeyLabel: "API Key Required",
  apiKeyShortLabel: "API Key",
  anyApiKeyLabel: "Any Key",
  yesLabel: "Yes",
  noLabel: "No",
  geographyLabel: "Geography",
} as const;

export const tableCopy = {
  caption: "Compare Available Datasets",
  datasetLabel: "Dataset",
  themeLabel: "Theme",
  accessLabel: "Access",
  formatsLabel: "Formats",
  difficultyLabel: "Difficulty",
  updatesLabel: "Updates",
  freeKeyLabel: "Key",
  noKeyLabel: "No Key",
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
  moreFormats: (count: number) => `${count} More Format${count === 1 ? "" : "s"}`,
  sortBy: (column: string, current: false | "asc" | "desc") =>
    current === "asc"
      ? `Sort ${column} Descending`
      : current === "desc"
        ? `Restore Default Order`
        : `Sort ${column} Ascending`,
} as const;

export const datasetCardCopy = {
  goodFirstBuildLabel: "Good First Build",
  apiKeyRequiredLabel: "Free API Key Required",
  noApiKeyLabel: "No API Key Required",
  viewGuideLabel: "View Guide",
  firstProjectLabel: "First Project",
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
  guideEyebrow: "Microproduct Data Guide",
  startGuideLabel: "Start the Guide",
  officialSourceLabel: "Open Official Source",
  atAGlanceTitle: "At a Glance",
  factLabels: {
    difficulty: "Difficulty",
    size: "Size",
    formats: "Formats",
    access: "Access",
    apiKey: "API Key",
    provider: "Provider",
    updates: "Updates",
    dataTerms: "Data Terms",
    verified: "Last Verified",
    sourceType: "Source Type",
    friction: "Setup Friction",
    setupMinutes: "Setup Time",
    sampleSize: "First Sample",
    registration: "Registration",
    rateLimits: "Rate Limits",
  },
  apiKeyRequiredLabel: "Required",
  apiKeyNotRequiredLabel: "Not Required",
  registrationRequiredLabel: "Required",
  registrationNotRequiredLabel: "Not Required",
  setupMinutes: (minutes: number) => `${minutes} min`,
  pythonSyntaxLabel: "Python Syntax Checked",
  notebookLabel: "Runnable Notebook",
  runtimeVerifiedLabel: (date: string) => `Runtime Verified ${date}`,
  expectedOutputTitle: "Expected Output",
  relatedTitle: "Related Datasets",
  colabLabel: "Open in Colab",
  feedbackLabel: "Report a Problem",
  replacementLabel: "See Replacement",
  statusUntilLabel: (date: string) => `Listed until ${date}`,
  accessTypes: (types: Dataset["access_type"]) =>
    types.map((type) => accessTypeLabels[type]).join(" or "),
  beginnerGuideEyebrow: "From Source to Product Signal",
  guideTitle: "Test a Product Idea in Four Steps",
  setupTitle: "Check the Setup",
  accessTitle: "Access the Data",
  pythonTitle: "Run the Python Example",
  pythonDescription: "Install the packages, then run the notebook cell.",
  pythonExampleAriaLabel: "Python Example",
  firstProjectEyebrow: "Test a Useful Signal",
  detailsTitle: "Dataset Details",
  conceptLabels: {
    theme: "Theme",
    domains: "Domains",
    dataTypes: "Data Types",
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
  title: "Build Paths",
  description:
    "Curated starting points for a first microproduct. Each path is reviewed independently of ordinary dataset additions.",
  catalogLinkLabel: "Browse Matching Catalog Filters",
  browseThemeLabel: "Browse This Theme in the Catalog",
  foundationLinkLabel: "Related Foundation Work",
  updatedLabel: (date: string) => `Reviewed ${date}`,
  curatorLabel: (curator: string) => `Curated by ${curator}`,
} as const;

export const contributeCopy = {
  title: "Contribution Studio",
  description:
    "Draft a dataset YAML file with the same schema, vocabulary, and guide-copy rules used in CI. Download the file and open a GitHub pull request. This page does not execute Python or create a pull request.",
  yamlLabel: "Dataset YAML",
  previewLabel: "Guide Preview",
  errorsLabel: "Validation Issues",
  downloadLabel: "Download YAML",
  copyYamlLabel: "Copy YAML",
  copiedYamlLabel: "YAML Copied",
  copyYamlErrorLabel: "Copy Failed",
  githubLabel: "Open Contribution Guide",
  pythonNotice:
    "Python syntax, live URL, and provider checks still run in repository CI. This studio never executes submitted code.",
  emptyPreview: "Fix validation issues to preview the guide.",
  loadExampleLabel: "Reset Template",
} as const;

export const copyButtonCopy = {
  idleLabel: "Copy Python",
  copiedLabel: "Copied",
  errorLabel: "Try Again",
  copiedAnnouncement: "Python code copied to clipboard.",
  errorAnnouncement: "Copy failed. Select the code and copy it manually.",
} as const;

export const notFoundCopy = {
  eyebrow: "404",
  title: "Page Not Found",
  description: "This page is not available. Browse the catalog to find a maintained dataset.",
  backLabel: "Back to Datasets",
} as const;
