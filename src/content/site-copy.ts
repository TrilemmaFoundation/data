import type { Dataset, DatasetTheme } from "@/lib/schema";

export const siteCopy = {
  name: "Trilemma Data",
  productLabel: "Data",
  foundationName: "Trilemma Foundation",
  foundationAriaLabel: "Trilemma Foundation main website",
  primaryNavigationLabel: "Primary",
  mobileNavigationLabel: "Mobile primary",
  datasetsNavigationLabel: "Datasets",
  contributeLabel: "Contribute",
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
    "Find actively maintained datasets and practical Python guides for building focused microproducts.",
  footerSummary:
    "Authoritative, actively maintained data for building focused microproducts. Trilemma links to source data; it does not host or relicense it.",
  copyright: (year: number) =>
    `© ${year} Trilemma Foundation. All rights reserved.`,
} as const;

export const catalogCopy = {
  heroTitle: "Choose a Dataset. Build a Microproduct.",
  searchLabel: "Search by topic, provider, or product use",
  searchPlaceholder: "Try “weather” or “filings”",
  recommendedDatasetId: "nws-weather-api",
  catalogEyebrow: "Dataset catalog",
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
  },
  apiKeyRequiredLabel: "Required",
  apiKeyNotRequiredLabel: "Not required",
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
