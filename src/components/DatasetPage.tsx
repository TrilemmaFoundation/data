import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowDown,
  CheckCircle2,
  ExternalLink,
  Lightbulb,
  NotebookPen,
  TerminalSquare,
} from "lucide-react";
import type { CatalogDataset, Dataset } from "@/lib/schema";
import { isActiveDataset } from "@/lib/schema";
import { catalogHref } from "@/lib/catalog-links";
import { datasetPath, DATASET_ISSUE_URL, FEEDBACK_URL } from "@/lib/seo";
import { colabNotebookUrl } from "@/lib/notebooks";
import { formatSizeRange, getSizeCategory } from "@/lib/size";
import {
  catalogStatusLabel,
  formatVerifiedDate,
  frictionLabel,
  pythonExampleStatus,
  sourceTypeLabel,
} from "@/lib/trust-signals";
import { CopyButton } from "@/components/CopyButton";
import { ShortlistToggle } from "@/components/ShortlistToggle";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  datasetGuideCopy,
  difficultyDescriptions,
  siteCopy,
} from "@/content/site-copy";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function ConceptPills({
  label,
  values,
  hrefFor,
}: {
  label: string;
  values: string[];
  hrefFor?: (value: string) => string;
}) {
  return (
    <div>
      <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
        {label}
      </h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => {
          const badge = (
            <Badge
              variant="outline"
              className="h-auto max-w-full justify-start rounded-full whitespace-normal"
            >
              {value}
            </Badge>
          );
          return hrefFor ? (
            <Link key={value} href={hrefFor(value)} className="rounded-full">
              {badge}
            </Link>
          ) : (
            <span key={value}>{badge}</span>
          );
        })}
      </div>
    </div>
  );
}

export function DatasetPage({
  dataset,
  related = [],
  notebookAvailable = false,
  shortlistEnabled = true,
}: {
  dataset: Dataset;
  related?: CatalogDataset[];
  notebookAvailable?: boolean;
  shortlistEnabled?: boolean;
}) {
  const sizeCategory = getSizeCategory(dataset.size_gb_max);
  const sizeRange = formatSizeRange(dataset.size_gb_min, dataset.size_gb_max);
  const guide = dataset.getting_started;
  const installCommand = `python -m pip install ${guide.python.packages.join(" ")}`;
  const pythonStatus = pythonExampleStatus(dataset);
  const active = isActiveDataset(dataset);
  const sampleRange =
    dataset.access_profile?.first_sample_gb_min !== undefined &&
    dataset.access_profile.first_sample_gb_max !== undefined
      ? formatSizeRange(
          dataset.access_profile.first_sample_gb_min,
          dataset.access_profile.first_sample_gb_max,
        )
      : null;

  const difficulty = difficultyDescriptions[dataset.difficulty];
  const facts: Array<[string, ReactNode]> = [
    [datasetGuideCopy.factLabels.difficulty, difficulty],
    [datasetGuideCopy.factLabels.size, `${sizeCategory} · ${sizeRange}`],
    [datasetGuideCopy.factLabels.formats, dataset.formats.join(", ")],
    [
      datasetGuideCopy.factLabels.access,
      datasetGuideCopy.accessTypes(dataset.access_type),
    ],
    [
      datasetGuideCopy.factLabels.apiKey,
      dataset.api_key_required
        ? datasetGuideCopy.apiKeyRequiredLabel
        : datasetGuideCopy.apiKeyNotRequiredLabel,
    ],
    [datasetGuideCopy.factLabels.provider, dataset.provider],
    [datasetGuideCopy.factLabels.updates, capitalize(dataset.update_frequency)],
    [
      datasetGuideCopy.factLabels.verified,
      formatVerifiedDate(dataset.last_verified),
    ],
    [datasetGuideCopy.factLabels.sourceType, sourceTypeLabel(dataset.source_type)],
    [
      datasetGuideCopy.factLabels.dataTerms,
      <a
        key="license"
        href={dataset.license_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex max-w-full items-start gap-1 text-primary hover:text-white"
      >
        <span className="min-w-0 break-words">{dataset.license}</span>
        <ExternalLink className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      </a>,
    ],
  ];

  if (dataset.access_profile) {
    facts.push(
      [datasetGuideCopy.factLabels.friction, frictionLabel(dataset.access_profile.friction)],
      [datasetGuideCopy.factLabels.setupMinutes, datasetGuideCopy.setupMinutes(dataset.access_profile.setup_minutes)],
      [
        datasetGuideCopy.factLabels.registration,
        dataset.access_profile.registration_required
          ? datasetGuideCopy.registrationRequiredLabel
          : datasetGuideCopy.registrationNotRequiredLabel,
      ],
    );
    if (dataset.access_profile.rate_limit_notes) {
      facts.push([datasetGuideCopy.factLabels.rateLimits, dataset.access_profile.rate_limit_notes]);
    }
    if (sampleRange) {
      facts.push([datasetGuideCopy.factLabels.sampleSize, sampleRange]);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <nav
        aria-label={datasetGuideCopy.breadcrumbAriaLabel}
        className="mb-4 text-sm text-muted-foreground"
      >
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="rounded-sm hover:text-primary">
              {siteCopy.datasetsNavigationLabel}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-white/80">
            {dataset.name}
          </li>
        </ol>
      </nav>

      {!active && (
        <div className="mb-5 rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm text-white" role="status">
          <p className="font-semibold">{catalogStatusLabel(dataset.catalog_status)}</p>
          {dataset.status_reason ? <p className="mt-1 text-white/80">{dataset.status_reason}</p> : null}
          {dataset.status_until ? (
            <p className="mt-1 text-white/80">{datasetGuideCopy.statusUntilLabel(dataset.status_until)}</p>
          ) : null}
          {dataset.replacement_id ? (
            <Link
              href={datasetPath(dataset.replacement_id)}
              className="mt-2 inline-flex font-semibold text-primary hover:text-white"
            >
              {datasetGuideCopy.replacementLabel}
            </Link>
          ) : null}
        </div>
      )}

      <header className="max-w-4xl">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="eyebrow">{datasetGuideCopy.guideEyebrow}</span>
          <Badge variant="secondary" className="capitalize">
            {dataset.difficulty}
          </Badge>
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-balance text-white sm:text-4xl">
          {dataset.name}
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
          {dataset.description}
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a href="#getting-started" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
            {datasetGuideCopy.startGuideLabel} <ArrowDown aria-hidden="true" />
          </a>
          <a
            href={dataset.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
          >
            {datasetGuideCopy.officialSourceLabel} <ExternalLink aria-hidden="true" />
          </a>
          {notebookAvailable && (
            <a
              href={colabNotebookUrl(dataset.id)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
            >
              {datasetGuideCopy.colabLabel} <NotebookPen aria-hidden="true" />
            </a>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {shortlistEnabled ? <ShortlistToggle id={dataset.id} /> : null}
          <a
            href={DATASET_ISSUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-sm text-sm font-semibold text-primary hover:text-white"
          >
            {datasetGuideCopy.feedbackLabel}
          </a>
        </div>
      </header>

      <section className="surface mt-6 p-5 sm:p-6" aria-labelledby="at-a-glance">
        <h2 id="at-a-glance" className="text-xl font-semibold text-white">
          {datasetGuideCopy.atAGlanceTitle}
        </h2>
        <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                {label}
              </dt>
              <dd className="mt-1.5 text-sm font-medium break-words text-white">{value}</dd>
            </div>
          ))}
        </dl>
        <ul className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-secondary">
          <li className="rounded-full border border-white/10 px-3 py-1">{datasetGuideCopy.pythonSyntaxLabel}</li>
          {pythonStatus.notebook && (
            <li className="rounded-full border border-white/10 px-3 py-1">{datasetGuideCopy.notebookLabel}</li>
          )}
          {pythonStatus.runtimeVerified && (
            <li className="rounded-full border border-white/10 px-3 py-1">
              {datasetGuideCopy.runtimeVerifiedLabel(formatVerifiedDate(pythonStatus.runtimeVerified))}
            </li>
          )}
        </ul>
      </section>

      <section id="getting-started" className="scroll-mt-24 pt-10" aria-labelledby="guide-title">
        <div className="max-w-3xl">
          <p className="eyebrow">{datasetGuideCopy.beginnerGuideEyebrow}</p>
          <h2 id="guide-title" className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            {datasetGuideCopy.guideTitle}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">{guide.overview}</p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <article className="surface p-6">
            <span className="grid size-9 place-items-center rounded-full bg-primary/15 font-bold text-primary">
              1
            </span>
            <h3 className="mt-5 text-xl font-semibold text-white">
              {datasetGuideCopy.setupTitle}
            </h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              {guide.prerequisites.map((item) => (
                <li key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-secondary" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="surface p-6">
            <span className="grid size-9 place-items-center rounded-full bg-primary/15 font-bold text-primary">
              2
            </span>
            <h3 className="mt-5 text-xl font-semibold text-white">
              {datasetGuideCopy.accessTitle}
            </h3>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              {guide.access_steps.map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="font-mono text-xs font-bold text-secondary">{index + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
            <a
              href={dataset.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-semibold text-primary hover:text-white"
            >
              {datasetGuideCopy.officialSourceLabel}{" "}
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </article>

          <article className="surface overflow-hidden lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-primary/15 font-bold text-primary">
                  3
                </span>
                <div>
                  <h3 className="font-semibold text-white">
                    {datasetGuideCopy.pythonTitle}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {datasetGuideCopy.pythonDescription}
                  </p>
                </div>
              </div>
              <CopyButton value={guide.python.code} />
            </div>
            <div
              className="overflow-x-auto bg-brand-black p-5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-6"
              tabIndex={0}
              aria-label={datasetGuideCopy.pythonExampleAriaLabel}
            >
              <p className="mb-4 font-mono text-xs text-secondary">{installCommand}</p>
              <pre className="min-w-max font-mono text-[0.82rem] leading-6 text-white/85">
                <code>{guide.python.code}</code>
              </pre>
            </div>
            {guide.python.expected_output && (
              <div className="border-t border-white/10 px-5 py-4 sm:px-6">
                <h4 className="text-sm font-semibold text-white">{datasetGuideCopy.expectedOutputTitle}</h4>
                <pre className="mt-2 overflow-x-auto font-mono text-xs leading-5 text-white/80">
                  <code>{guide.python.expected_output}</code>
                </pre>
              </div>
            )}
          </article>

          <article className="surface p-6 lg:col-span-2">
            <div className="flex gap-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 font-bold text-primary">
                4
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-primary">
                  <Lightbulb className="size-5" aria-hidden="true" />
                  <p className="text-xs font-bold tracking-wider uppercase">
                    {datasetGuideCopy.firstProjectEyebrow}
                  </p>
                </div>
                <h3 className="mt-2 text-xl font-semibold text-white">{guide.first_project.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{guide.first_project.goal}</p>
                <ol className="mt-5 grid gap-3 md:grid-cols-3">
                  {guide.first_project.steps.map((step, index) => (
                    <li key={step} className="rounded-lg border border-white/10 bg-brand-black/25 p-4 text-sm leading-6 text-white/80">
                      <span className="mb-2 block font-mono text-xs font-bold text-secondary">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </article>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-10" aria-labelledby="related-title">
          <div className="surface p-6 sm:p-7">
            <h2 id="related-title" className="text-xl font-semibold text-white">
              {datasetGuideCopy.relatedTitle}
            </h2>
            <ul className="mt-4 grid gap-3 md:grid-cols-3">
              {related.map((item) => (
                <li key={item.id}>
                  <Link
                    href={datasetPath(item.id)}
                    className="block rounded-lg border border-white/10 p-4 hover:border-primary/50"
                  >
                    <p className="font-semibold text-white">{item.name}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {item.first_project_title}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="mt-10" aria-labelledby="explore-title">
        <div className="surface p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <TerminalSquare className="mt-1 size-6 shrink-0 text-secondary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 id="explore-title" className="text-xl font-semibold text-white">
                {datasetGuideCopy.detailsTitle}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {datasetGuideCopy.detailsSummary({
                  provider: dataset.provider,
                  sourceType: dataset.source_type,
                  lastVerified: dataset.last_verified,
                  temporalCoverage: dataset.temporal_coverage,
                })}
              </p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <ConceptPills
                  label={datasetGuideCopy.conceptLabels.theme}
                  values={[dataset.theme]}
                  hrefFor={() => catalogHref({ theme: dataset.theme })}
                />
                <ConceptPills
                  label={datasetGuideCopy.conceptLabels.domains}
                  values={dataset.domains}
                  hrefFor={(value) => catalogHref({ domains: [value] })}
                />
                <ConceptPills
                  label={datasetGuideCopy.conceptLabels.dataTypes}
                  values={dataset.data_types}
                  hrefFor={(value) => catalogHref({ dataTypes: [value] })}
                />
                <ConceptPills
                  label={datasetGuideCopy.conceptLabels.tasks}
                  values={dataset.tasks}
                  hrefFor={(value) => catalogHref({ tasks: [value] })}
                />
                <ConceptPills
                  label={datasetGuideCopy.conceptLabels.geography}
                  values={dataset.geography}
                  hrefFor={(value) => catalogHref({ geographies: [value] })}
                />
                <ConceptPills
                  label={datasetGuideCopy.factLabels.formats}
                  values={dataset.formats}
                  hrefFor={(value) => catalogHref({ formats: [value] })}
                />
                <ConceptPills
                  label={datasetGuideCopy.factLabels.provider}
                  values={[dataset.provider]}
                />
                <ConceptPills
                  label={datasetGuideCopy.factLabels.dataTerms}
                  values={[dataset.license]}
                />
              </div>
              <p className="mt-6 text-sm">
                <a
                  href={FEEDBACK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:text-white"
                >
                  {siteCopy.feedbackLabel}
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
