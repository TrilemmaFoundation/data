import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppActions } from "@/components/AppActions";
import { AppIdentity } from "@/components/AppIdentity";
import { Badge } from "@/components/ui/badge";
import { apps, getAppBySlug, type AppSource } from "@/content/apps";
import { appVisuals } from "@/content/app-visuals";
import { appsCopy } from "@/content/site-copy";
import { appPath, APPS_PATH, datasetPath, pageSocialMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return apps.map((app) => ({ slug: app.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const app = getAppBySlug(slug);
  if (!app) return { title: "Page Not Found" };
  return pageSocialMetadata(appPath(app.slug), app.title, app.summary);
}

export default async function AppDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = getAppBySlug(slug);
  if (!app) notFound();

  const groups = new Map<string, AppSource[]>();
  for (const source of app.sources) {
    const group = source.group ?? appsCopy.sourcesTitle;
    groups.set(group, [...(groups.get(group) ?? []), source]);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <Link href={APPS_PATH} className="rounded-sm hover:text-link">{appsCopy.title}</Link>
      </nav>
      <div
        className="app-detail-header rounded-2xl p-5 sm:p-6"
        style={{ "--app-accent": appVisuals[app.slug as keyof typeof appVisuals].accent } as CSSProperties}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AppIdentity app={app} level={1} />
          {app.status && <Badge variant="outline" className="rounded-full border-white/50 bg-white/10 text-white">{appsCopy.statusLabels[app.status]}</Badge>}
        </div>
        <p className="mt-3 max-w-3xl text-base leading-7 text-feature-foreground">{app.summary}</p>
        <div className="mt-5"><AppActions app={app} /></div>
      </div>

      <section aria-labelledby="app-sources-title" className="mt-10">
        <h2 id="app-sources-title" className="text-2xl font-semibold">{appsCopy.sourcesTitle}</h2>
        <p className="mt-2 max-w-3xl text-base leading-7 text-muted-foreground">{app.sourceIntro}</p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{appsCopy.sourceDisclosure}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          {appsCopy.reviewedLabel} <time dateTime={app.reviewedAt}>{app.reviewedAt}</time> ·{" "}
          <a href={app.sourceEvidenceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-link hover:underline">
            {appsCopy.sourceEvidenceLabel}<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
        {Array.from(groups, ([group, sources]) => (
          <section key={group} aria-labelledby={`source-group-${group.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="mt-8">
            <h3 id={`source-group-${group.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="text-xl font-semibold">{group}</h3>
            <ul className="mt-4 grid gap-4 md:grid-cols-2">
              {sources.map((source) => (
                <li key={source.name} className="rounded-2xl border border-[var(--tf-soft-periwinkle)] bg-white p-5">
                  <h4 className="text-lg font-semibold text-foreground">{source.name}</h4>
                  <p className="mt-2 text-sm"><strong>{appsCopy.sourceRoleLabel}:</strong> {source.role}</p>
                  <p className="mt-1 text-sm"><strong>{appsCopy.sourceAvailabilityLabel}:</strong> {source.availability}</p>
                  {source.coverage && <p className="mt-1 text-sm"><strong>{appsCopy.sourceCoverageLabel}:</strong> {source.coverage}</p>}
                  {source.details && <p className="mt-2 text-sm leading-6 text-muted-foreground">{source.details}</p>}
                  {source.systems && (
                    <details className="mt-3 rounded-lg border border-[var(--tf-soft-periwinkle)] p-3 text-sm">
                      <summary className="cursor-pointer font-semibold">Review {source.systems.length} named warning {source.systems.length === 1 ? "system" : "systems"}</summary>
                      <ul className="mt-3 space-y-3">
                        {source.systems.map((system) => (
                          <li key={system.id} className="border-t border-[var(--tf-soft-periwinkle)] pt-3">
                            <p className="font-semibold">{system.name} <span className="font-normal text-muted-foreground">({system.status.replaceAll("_", " ")})</span></p>
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                              <a href={system.officialUrl} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">Official source<span className="sr-only"> for {system.name} (opens in a new tab)</span></a>
                              {system.accessUrl && system.accessUrl !== system.officialUrl && <a href={system.accessUrl} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">Access path<span className="sr-only"> for {system.name} (opens in a new tab)</span></a>}
                              {system.termsUrl && <a href={system.termsUrl} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">Reuse terms<span className="sr-only"> for {system.name} (opens in a new tab)</span></a>}
                              {system.guideId && <Link href={datasetPath(system.guideId)} className="text-link hover:underline">Data guide<span className="sr-only"> for {system.name}</span></Link>}
                              {system.guideIds?.map((guide) => <Link key={guide.id} href={datasetPath(guide.id)} className="text-link hover:underline">{guide.label} guide<span className="sr-only"> for {system.name}</span></Link>)}
                            </div>
                            {system.noGuideReason && <p className="mt-1 text-muted-foreground">{system.noGuideReason}</p>}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
                    <a href={source.officialUrl} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
                      {appsCopy.officialSourceLabel}<span className="sr-only"> for {source.name} (opens in a new tab)</span>
                    </a>
                    {source.additionalUrls?.map(({ label, href }) => (
                      <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
                        {label}<span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ))}
                    {source.evidenceUrl && (
                      <a href={source.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
                        {appsCopy.sourceEvidenceLabel}<span className="sr-only"> for {source.name} (opens in a new tab)</span>
                      </a>
                    )}
                    {source.guideId && (
                      <Link href={datasetPath(source.guideId)} className="text-link hover:underline">
                        {appsCopy.guideLabel}<span className="sr-only"> for {source.name}</span>
                      </Link>
                    )}
                    {source.guideIds?.map((guide) => (
                      <Link key={guide.id} href={datasetPath(guide.id)} className="text-link hover:underline">
                        {guide.label} guide<span className="sr-only"> for {source.name}</span>
                      </Link>
                    ))}
                    {source.relatedGuideId && (
                      <Link href={datasetPath(source.relatedGuideId)} className="text-link hover:underline">
                        {appsCopy.relatedGuideLabel}<span className="sr-only"> for {source.name}</span>
                      </Link>
                    )}
                  </div>
                  {source.noGuideReason && <p className="mt-3 text-sm text-muted-foreground">{source.noGuideReason}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </section>
    </div>
  );
}
