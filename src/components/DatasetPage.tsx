import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowDown,
  CheckCircle2,
  ExternalLink,
  Lightbulb,
  TerminalSquare,
} from "lucide-react";
import type { Dataset } from "@/lib/schema";
import { formatSizeRange, getSizeCategory } from "@/lib/size";
import { CopyButton } from "@/components/CopyButton";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCESS_TYPE_LABELS: Record<Dataset["access_type"][number], string> = {
  download: "Download",
  api: "API",
  both: "Download and API",
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function indefiniteArticle(value: string): "a" | "an" {
  return /^[aeiou]/i.test(value) ? "an" : "a";
}

function ConceptPills({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  return (
    <div>
      <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
        {label}
      </h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <Badge key={value} variant="outline">
            {value}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function DatasetPage({ dataset }: { dataset: Dataset }) {
  const sizeCategory = getSizeCategory(dataset.size_gb_max);
  const sizeRange = formatSizeRange(dataset.size_gb_min, dataset.size_gb_max);
  const guide = dataset.getting_started;
  const installCommand = `python -m pip install ${guide.python.packages.join(" ")}`;

  const difficulty = {
    beginner: "Beginner — comfortable for a first project",
    intermediate: "Intermediate — some data preparation helps",
    advanced: "Advanced — expect specialized tools or domain knowledge",
  }[dataset.difficulty];
  const facts: Array<[string, ReactNode]> = [
    ["Difficulty", difficulty],
    ["Size", `${sizeCategory} · ${sizeRange}`],
    ["Formats", dataset.formats.join(", ")],
    ["Access", dataset.access_type.map((type) => ACCESS_TYPE_LABELS[type]).join(" or ")],
    ["API key", dataset.api_key_required ? "Required" : "Not required"],
    ["Provider", dataset.provider],
    ["Updates", capitalize(dataset.update_frequency)],
    [
      "Data terms",
      <a
        key="license"
        href={dataset.license_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-primary hover:text-white"
      >
        {dataset.license} <ExternalLink className="size-3.5" aria-hidden="true" />
      </a>,
    ],
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-7 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="rounded-sm hover:text-primary">
              Datasets
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-white/80">
            {dataset.name}
          </li>
        </ol>
      </nav>

      <header className="max-w-4xl">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="eyebrow">Dataset guide</span>
          <Badge variant="secondary" className="capitalize">
            {dataset.difficulty}
          </Badge>
        </div>
        <h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
          {dataset.name}
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
          {dataset.description}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <a href="#getting-started" className={cn(buttonVariants({ size: "lg" }))}>
            Start with this dataset <ArrowDown aria-hidden="true" />
          </a>
          <a
            href={dataset.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            Official source <ExternalLink aria-hidden="true" />
          </a>
        </div>
      </header>

      <section className="surface mt-10 p-5 sm:p-7" aria-labelledby="at-a-glance">
        <h2 id="at-a-glance" className="text-xl font-semibold text-white">
          At a glance
        </h2>
        <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                {label}
              </dt>
              <dd className="mt-1.5 text-sm font-medium text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="getting-started" className="scroll-mt-24 pt-16" aria-labelledby="guide-title">
        <div className="max-w-3xl">
          <p className="eyebrow">Beginner guide</p>
          <h2 id="guide-title" className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            Get started in four steps
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">{guide.overview}</p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <article className="surface p-6">
            <span className="grid size-9 place-items-center rounded-full bg-primary/15 font-bold text-primary">
              1
            </span>
            <h3 className="mt-5 text-xl font-semibold text-white">Before you start</h3>
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
            <h3 className="mt-5 text-xl font-semibold text-white">Get the data</h3>
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
              Open official source <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </article>

          <article className="surface overflow-hidden lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-primary/15 font-bold text-primary">
                  3
                </span>
                <div>
                  <h3 className="font-semibold text-white">Load it in Python</h3>
                  <p className="text-xs text-muted-foreground">Install the packages, then run the notebook cell.</p>
                </div>
              </div>
              <CopyButton value={guide.python.code} />
            </div>
            <div
              className="overflow-x-auto bg-[#080910] p-5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-6"
              tabIndex={0}
              aria-label="Python example"
            >
              <p className="mb-4 font-mono text-xs text-secondary">{installCommand}</p>
              <pre className="min-w-max font-mono text-[0.82rem] leading-6 text-white/85">
                <code>{guide.python.code}</code>
              </pre>
            </div>
          </article>

          <article className="surface p-6 lg:col-span-2">
            <div className="flex gap-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 font-bold text-primary">
                4
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-primary">
                  <Lightbulb className="size-5" aria-hidden="true" />
                  <p className="text-xs font-bold tracking-wider uppercase">First project</p>
                </div>
                <h3 className="mt-2 text-xl font-semibold text-white">{guide.first_project.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{guide.first_project.goal}</p>
                <ol className="mt-5 grid gap-3 sm:grid-cols-3">
                  {guide.first_project.steps.map((step, index) => (
                    <li key={step} className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-sm leading-6 text-white/80">
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

      <section className="mt-16" aria-labelledby="explore-title">
        <div className="surface p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <TerminalSquare className="mt-1 size-6 shrink-0 text-secondary" aria-hidden="true" />
            <div>
              <h2 id="explore-title" className="text-xl font-semibold text-white">
                Dataset details
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {dataset.provider} is {indefiniteArticle(dataset.source_type)} {dataset.source_type} source. Last verified {dataset.last_verified}. Temporal coverage: {dataset.temporal_coverage ?? "not applicable"}.
              </p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <ConceptPills label="Domains" values={dataset.domains} />
                <ConceptPills label="Data types" values={dataset.data_types} />
                <ConceptPills label="Tasks" values={dataset.tasks} />
                <ConceptPills label="Geography" values={dataset.geography} />
                <ConceptPills label="Formats" values={dataset.formats} />
                <ConceptPills label="Provider" values={[dataset.provider]} />
                <ConceptPills label="Data terms" values={[dataset.license]} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
